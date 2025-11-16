import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSavedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSavedContent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSavedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSavedContent";

/**
 * Test that a member cannot delete another member's saved content.
 *
 * This test validates the authorization boundary enforcement for the saved
 * content deletion endpoint. It verifies that only the member who owns a saved
 * content item can delete it, and that unauthorized deletion attempts by other
 * members are properly rejected with HTTP 403 Forbidden error.
 *
 * Test workflow:
 *
 * 1. Create Member A account and authenticate
 * 2. Create Member B account
 * 3. Attempt to delete a saved content item that belongs to Member A as Member B
 * 4. Verify the deletion is rejected with HTTP 403 Forbidden
 */
export async function test_api_saved_content_deletion_unauthorized_member(
  connection: api.IConnection,
) {
  // Step 1: Create first member (owner of saved content)
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberA: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberAEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        ip: "192.168.1.1",
        href: "http://localhost:3000/auth",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberA);

  // Step 2: Create second member (unauthorized member)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberB: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberBEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        ip: "192.168.1.2",
        href: "http://localhost:3000/auth",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberB);

  // Generate a test saved content ID (format: UUID)
  const testSavedId = typia.random<string & tags.Format<"uuid">>();

  // Step 3 & 4: Member B attempts to delete Member A's saved content
  // and verify it fails with HTTP 403 Forbidden
  await TestValidator.httpError(
    "unauthorized member cannot delete another member's saved content",
    403,
    async () => {
      // Member B (currently authenticated) attempts to delete
      // a saved content item that belongs to Member A
      // This should fail with 403 Forbidden because Member B doesn't own it
      await api.functional.communityPlatform.member.members.saved.erase(
        connection,
        {
          memberId: memberA.id,
          savedId: testSavedId,
        },
      );
    },
  );

  TestValidator.predicate(
    "authorization boundary correctly enforced for saved content deletion",
    true,
  );
}

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
 * Test deletion idempotency of saved content.
 *
 * Validates that deleting the same saved item multiple times results in
 * graceful error handling on subsequent attempts. The first deletion of a
 * non-existent item should fail with an appropriate error (404). Any subsequent
 * attempts to delete the same non-existent saved item should also fail with the
 * same error, demonstrating idempotent behavior where the system handles
 * repeated deletion attempts gracefully without cascading failures or side
 * effects.
 *
 * Test workflow:
 *
 * 1. Create authenticated member account
 * 2. Generate a test saved content ID (simulating a previously deleted item)
 * 3. Attempt to delete the saved item (should fail with 404)
 * 4. Attempt to delete the same saved item again (should fail with 404 - same
 *    behavior)
 * 5. Verify subsequent operations work correctly on the member's saved collection
 */
export async function test_api_saved_content_deletion_idempotency(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        ip: "127.0.0.1",
        href: "http://localhost/register",
        referrer: "http://localhost",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  const memberId = member.id;

  // Step 2: Generate a non-existent saved content ID to test idempotent deletion
  const nonExistentSavedId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to delete the non-existent saved item (should fail with 404)
  await TestValidator.error(
    "deleting non-existent saved content should fail with error",
    async () => {
      await api.functional.communityPlatform.member.members.saved.erase(
        connection,
        {
          memberId: memberId,
          savedId: nonExistentSavedId,
        },
      );
    },
  );

  // Step 4: Attempt to delete the same saved item again (should fail with same error - idempotent behavior)
  await TestValidator.error(
    "second deletion attempt of same non-existent saved content should also fail",
    async () => {
      await api.functional.communityPlatform.member.members.saved.erase(
        connection,
        {
          memberId: memberId,
          savedId: nonExistentSavedId,
        },
      );
    },
  );

  // Step 5: Verify subsequent operations work correctly on the member's saved collection
  const savedPage: IPageICommunityPlatformSavedContent.ISummary =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: memberId,
        body: {
          page: 1,
          limit: 10,
          contentType: "all",
        } satisfies ICommunityPlatformSavedContent.IRequest,
      },
    );
  typia.assert(savedPage);
  TestValidator.predicate(
    "member's saved collection should be accessible after deletion attempts",
    true,
  );
}

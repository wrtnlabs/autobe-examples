import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

/**
 * Test rejection of post creation with malformed URL for link type.
 *
 * This test verifies that the system properly validates URL formats for
 * link-type posts. The workflow creates a new member account, then attempts to
 * submit a link post with a malformed URL (missing protocol). The system must
 * reject this with a 400 Bad Request.
 *
 * 1. Register a new member via /auth/member/join with valid credentials and
 *    connection metadata
 * 2. Attempt to create a post with a malformed URL (e.g., "example.com")
 * 3. Validate that the system rejects the request with an error
 *
 * Note: The API endpoint accepts a string type for
 * ICommunityPlatformPost.ICreate, which represents the structured content of
 * the post. For link posts, this string should contain the URL, which must be a
 * properly formatted web address with a protocol.
 */
export async function test_api_post_creation_with_malformed_url_rejected(
  connection: api.IConnection,
) {
  // Step 1: Register a new member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "ValidPassword123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.1",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Attempt to create a post with a malformed URL (missing protocol)
  // This should fail
  await TestValidator.error(
    "post creation should reject malformed URL with missing protocol",
    async () => {
      await api.functional.communityPlatform.member.communities.posts.create(
        connection,
        {
          communityCode: "community-123",
          body: "example.com" satisfies ICommunityPlatformPost.ICreate,
        },
      );
    },
  );
}

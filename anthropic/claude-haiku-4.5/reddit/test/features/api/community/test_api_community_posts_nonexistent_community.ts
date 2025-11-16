import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

/**
 * Test error handling when retrieving posts from a non-existent community.
 *
 * This test validates that the API correctly returns a 404 Not Found error when
 * attempting to retrieve posts from a community that does not exist.
 *
 * Process:
 *
 * 1. Create a member account through authentication
 * 2. Attempt to retrieve posts from a non-existent community UUID
 * 3. Verify that the API throws an HttpError with 404 status code
 * 4. Ensure no unintended data is returned
 */
export async function test_api_community_posts_nonexistent_community(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: "SecurePassword123!",
    ip: "127.0.0.1",
    href: "http://localhost:3000/auth/member/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Attempt to retrieve posts from a non-existent community
  const nonexistentCommunityId = typia.random<string & tags.Format<"uuid">>();

  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformPost.IRequest;

  // Step 3: Verify that the API throws a 404 error for non-existent community
  await TestValidator.httpError(
    "should return 404 error for non-existent community",
    404,
    async () => {
      return await api.functional.communityPlatform.communities.posts.index(
        connection,
        {
          communityId: nonexistentCommunityId,
          body: requestBody,
        },
      );
    },
  );
}

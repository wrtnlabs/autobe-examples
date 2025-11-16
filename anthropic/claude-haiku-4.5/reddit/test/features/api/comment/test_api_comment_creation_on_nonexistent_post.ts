import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test error handling when attempting to create a comment on a non-existent
 * post.
 *
 * This test validates that the API properly rejects comment creation requests
 * when targeting a post that does not exist. The workflow involves:
 *
 * 1. Creating a member account for authentication
 * 2. Attempting to create a comment with a non-existent post ID
 * 3. Verifying that the operation fails with appropriate error handling
 *
 * This ensures that comments cannot be orphaned from non-existent posts and
 * maintains referential integrity in the comment system.
 */
export async function test_api_comment_creation_on_nonexistent_post(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Generate a non-existent post ID
  const nonExistentPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Attempt to create a comment on the non-existent post
  await TestValidator.error(
    "cannot create comment on non-existent post",
    async () => {
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: nonExistentPostId,
            content: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );
}

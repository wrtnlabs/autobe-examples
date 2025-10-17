import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentNode } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentNode";

/**
 * Ensure requesting the comment tree for a non-existent post fails without
 * leaking data.
 *
 * Business context:
 *
 * - The comment tree endpoint is publicly readable for accessible posts.
 * - When a post does not exist (or is not visible), the backend should not return
 *   any partial tree data and must respond with an error.
 *
 * Steps:
 *
 * 1. Create an unauthenticated connection to reflect public access.
 * 2. Generate a random UUID to represent a non-existent postId.
 * 3. Call the comment tree endpoint and assert that an error occurs.
 *
 * Notes:
 *
 * - Per testing rules, do not assert specific HTTP status codes or inspect error
 *   messages.
 * - Only verify that the request fails as expected.
 */
export async function test_api_comment_tree_post_not_found(
  connection: api.IConnection,
) {
  // 1) Unauthenticated connection (do not manipulate headers further)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Random UUID for a non-existent postId
  const missingPostId = typia.random<string & tags.Format<"uuid">>();

  // 3) Expect an error when fetching comment tree of a non-existent post
  await TestValidator.error(
    "requesting comment tree for non-existent post should fail",
    async () => {
      await api.functional.communityPlatform.posts.comments.index(unauthConn, {
        postId: missingPostId,
      });
    },
  );
}

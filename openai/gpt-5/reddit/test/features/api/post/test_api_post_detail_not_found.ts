import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IECommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostType";
import type { IECommunityPlatformPostVisibilityState } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostVisibilityState";

/**
 * Ensure post detail fetch fails for non-existent post ID without
 * authentication.
 *
 * Business context:
 *
 * - GET /communityPlatform/posts/{postId} returns a single post when it exists
 *   and is visible.
 * - For a random UUID that does not exist, backend should reject the request.
 * - This test performs the request without Authorization and validates failure
 *   via error throwing.
 *
 * Steps:
 *
 * 1. Build an unauthenticated connection (empty headers) from the provided
 *    connection.
 * 2. Generate a random UUID as a non-existent postId.
 * 3. Invoke the detail endpoint and assert that it throws an error using
 *    TestValidator.error.
 */
export async function test_api_post_detail_not_found(
  connection: api.IConnection,
) {
  // 1) Unauthenticated connection (do not touch headers afterward)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Random non-existent UUID
  const postId = typia.random<string & tags.Format<"uuid">>();

  // 3) Expect error when requesting non-existent post
  await TestValidator.error("non-existent post should fail", async () => {
    await api.functional.communityPlatform.posts.at(unauthConn, { postId });
  });
}

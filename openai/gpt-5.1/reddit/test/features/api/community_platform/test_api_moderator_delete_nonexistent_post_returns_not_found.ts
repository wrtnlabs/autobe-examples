import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";

/**
 * Validate 404 behavior when a moderator deletes a non-existent post.
 *
 * Business goal: Ensure that the community moderator hard-delete endpoint for
 * posts responds with an appropriate not-found HTTP error when the target
 * postId does not exist, and that the flow goes through a properly
 * authenticated moderator context.
 *
 * High-level steps:
 *
 * 1. Register a new community moderator using the public join endpoint.
 *
 *    - This establishes an authenticated moderator session and automatically
 *         attaches the access token to the shared connection.
 * 2. Generate a random UUID to represent a non-existent postId.
 *
 *    - We intentionally do not create any posts in this test, so any random UUID is
 *         overwhelmingly likely to not correspond to a real post.
 * 3. Call the erase endpoint as the authenticated moderator with this non-existent
 *    postId.
 * 4. Assert that the call fails with an HttpError carrying status 404.
 *
 * Notes and limitations:
 *
 * - We cannot directly verify lack of side effects (no list/read/audit APIs are
 *   available in this test scope), so we only assert the HTTP error contract
 *   for non-existent resources.
 */
export async function test_api_moderator_delete_nonexistent_post_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Register a fresh community moderator via join endpoint
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: joinBody,
    });
  typia.assert(moderator);

  // 2. Generate a random UUID to act as a non-existent postId
  const nonexistentPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3-4. Call erase with the nonexistent ID and assert 404 Not Found
  await TestValidator.httpError(
    "deleting a non-existent post as moderator returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.communityModerator.posts.erase(
        connection,
        { postId: nonexistentPostId },
      );
    },
  );
}

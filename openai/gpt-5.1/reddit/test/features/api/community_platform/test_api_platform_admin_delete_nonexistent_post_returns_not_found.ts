import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate platform-admin deletion behavior on a non-existent post.
 *
 * Business goal: Ensure that when a platform administrator, authenticated via
 * the /auth/platformAdmin/join endpoint, attempts to permanently delete a post
 * by an identifier that does not correspond to any existing record in
 * community_platform_posts, the API responds with a clear not-found HTTP error
 * and does not perform any state mutation.
 *
 * High-level flow:
 *
 * 1. Register a new platform administrator using
 *    api.functional.auth.platformAdmin.join to obtain an authenticated admin
 *    context (the SDK configures Authorization headers automatically based on
 *    the returned token).
 * 2. Generate a synthetic postId value that is extremely unlikely to correspond to
 *    a real post (for example, a random UUID-format string or random
 *    alphanumeric string). The test purposely does not create any posts
 *    beforehand to keep behavior focused on the “non-existent target” case.
 * 3. Invoke api.functional.communityPlatform.platformAdmin.posts.erase with this
 *    synthetic postId while the connection is authenticated as the platform
 *    admin.
 * 4. Use TestValidator.httpError to assert that the call fails with a 404 Not
 *    Found HTTP status code, indicating that the backend could not locate the
 *    specified post identifier.
 *
 * Design notes and constraints:
 *
 * - The SDK only exposes the join and erase endpoints for this scenario, so we
 *   cannot explicitly verify that no posts were deleted or that the global post
 *   count remains unchanged. Those invariants are taken as guaranteed by the
 *   backend once it returns a not-found response.
 * - We must not touch connection.headers directly; join configures the
 *   Authorization header automatically using the returned token.
 * - We rely on TestValidator.httpError for status-code validation instead of
 *   manually catching HttpError, as it provides clearer, reusable semantics and
 *   better error messages on failure.
 */
export async function test_api_platform_admin_delete_nonexistent_post_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator to obtain an authenticated context
  const joinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    // optional ip is omitted
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);
  typia.assert<ICommunityPlatformAccountStatus.ISummary>(admin.accountStatus);

  // 2. Generate a synthetic, non-existent postId value
  // We use a random UUID-formatted string to minimize collision probability.
  const nonexistentPostId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3 & 4. Attempt deletion and assert that we get a 404 Not Found HTTP error
  await TestValidator.httpError(
    "platform admin delete on non-existent post must return 404",
    404,
    async () => {
      await api.functional.communityPlatform.platformAdmin.posts.erase(
        connection,
        {
          postId: nonexistentPostId,
        },
      );
    },
  );
}

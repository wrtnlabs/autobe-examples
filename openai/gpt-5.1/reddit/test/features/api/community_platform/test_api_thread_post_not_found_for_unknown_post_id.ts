import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Verify not-found behavior for unknown community thread postId.
 *
 * Business goal
 *
 * - Ensure that fetching a community thread with a syntactically valid but
 *   unknown UUID results in a clean not-found style error, rather than a
 *   successful response or an internal server error.
 * - Confirm that the behavior is the same whether the caller is anonymous or an
 *   authenticated member user, so that missing resources do not expose any
 *   additional information based on authentication state.
 *
 * Scenario
 *
 * 1. Register a new member user using the auth.memberUser.join endpoint via the
 *    main `connection`. This proves the backend is functioning and yields an
 *    authenticated session on that connection.
 * 2. Create a second `unauthConnection` that is identical to `connection` except
 *    that it has an empty `headers` object, ensuring there is no Authorization
 *    header and calls are made anonymously.
 * 3. Generate a random UUID string using `typia.random<string &
 *    tags.Format<"uuid">>()`. This UUID is extremely unlikely to match any real
 *    post id, so it is used as an "unknown" postId.
 * 4. Using the anonymous `unauthConnection`, call
 *    `api.functional.communityPlatform.threads.at` with the random UUID as
 *    `postId` and assert via `TestValidator.error` that an error is thrown when
 *    the backend attempts to resolve the missing resource. The test does not
 *    depend on any specific HTTP status code.
 * 5. Using the authenticated original `connection` (which now carries the member
 *    user Authorization header from the join call), call the same threads.at
 *    endpoint with the same unknown `postId` and again assert via
 *    `TestValidator.error` that an error is thrown. This validates that the
 *    not-found behavior is independent of authentication context.
 * 6. The test does not inspect error message bodies, headers, or numeric status
 *    codes to avoid relying on internal error envelope formats; it only
 *    verifies that missing posts are reported as errors in a consistent manner
 *    across auth contexts.
 */
export async function test_api_thread_post_not_found_for_unknown_post_id(
  connection: api.IConnection,
) {
  // 1. Register a new member user to ensure the system is healthy and to
  //    obtain an authenticated session on `connection`.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedMember);

  // 2. Create an unauthenticated connection by cloning host/options but
  //    resetting headers to an empty object. Do NOT touch headers afterward.
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Generate a random UUID that is extremely unlikely to exist as a post.
  const unknownPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Anonymous caller should receive an error when requesting the
  //    unknown postId.
  await TestValidator.error(
    "anonymous caller gets error for unknown thread postId",
    async () => {
      await api.functional.communityPlatform.threads.at(unauthConnection, {
        postId: unknownPostId,
      });
    },
  );

  // 5. Authenticated member user should see the same kind of behavior
  //    (still an error) for the same unknown postId.
  await TestValidator.error(
    "authenticated member gets error for unknown thread postId",
    async () => {
      await api.functional.communityPlatform.threads.at(connection, {
        postId: unknownPostId,
      });
    },
  );
}

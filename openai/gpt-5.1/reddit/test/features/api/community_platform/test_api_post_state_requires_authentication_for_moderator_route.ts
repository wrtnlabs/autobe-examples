import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";

/**
 * Ensure that moderator-only post state endpoint requires authentication.
 *
 * Business goal: This test verifies that the community moderator-specific
 * endpoint for retrieving a post's lifecycle and moderation state cannot be
 * accessed anonymously. Any caller that does not present valid moderator
 * credentials must receive an HTTP 401 Unauthorized (or equivalent) response,
 * and must not receive an `ICommunityPlatformPostState` payload.
 *
 * Scenario:
 *
 * 1. Start from the provided `connection`, which may already carry authentication
 *    from previous tests. To guarantee an unauthenticated request, derive a new
 *    connection object that reuses host/options/etc. but has its own empty
 *    `headers: {}` so that no Authorization header is sent.
 * 2. Generate an arbitrary post identifier (use a random UUID string via
 *    typia.random) to use as `{postId}`. The existence of the post is
 *    irrelevant; we only care about authentication behavior.
 * 3. Invoke `api.functional.communityPlatform.communityModerator.posts.state.at`
 *    with the unauthenticated connection and the random `postId`.
 * 4. Assert that the call fails with an HTTP 401 Unauthorized status using
 *    `TestValidator.httpError`, which is designed to validate HTTP status codes
 *    for thrown HttpError instances.
 *
 * Expectations:
 *
 * - The call must not succeed with an `ICommunityPlatformPostState` response.
 * - The server must reject the request as unauthorized (401) when no
 *   Authorization token is present for the communityModerator actor.
 * - No further checks on the response body are required; ensuring the HTTP status
 *   is sufficient to confirm that the endpoint is protected from anonymous
 *   access.
 */
export async function test_api_post_state_requires_authentication_for_moderator_route(
  connection: api.IConnection,
) {
  // 1. Derive an unauthenticated connection by resetting headers to an empty object.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Generate a random UUID-like postId. Existence is irrelevant; only auth behavior matters.
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Issue the GET request to the moderator-specific state endpoint without Authorization.
  // 4. Assert that the response is an HTTP 401 Unauthorized error.
  await TestValidator.httpError(
    "unauthenticated moderator post state access should return 401",
    401,
    async () => {
      await api.functional.communityPlatform.communityModerator.posts.state.at(
        unauthenticatedConnection,
        {
          postId,
        },
      );
    },
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";

/**
 * Validate that requesting post state for a non-existent post returns a
 * not-found HTTP error.
 *
 * Business purpose:
 *
 * - Ensure that the memberUser-facing state endpoint does not silently succeed or
 *   leak inconsistent state when an invalid post identifier is provided.
 * - Confirm that the backend surfaces a proper not-found error (404) when the
 *   target post does not exist, while the caller is fully authenticated.
 *
 * Scenario steps:
 *
 * 1. Register (join) a new member user via POST /auth/memberUser/join to obtain an
 *    authenticated context. The SDK automatically attaches the access token to
 *    the connection headers.
 * 2. Generate a random UUID that is never used to create any post in this test.
 *    This UUID acts as a guaranteed-nonexistent postId.
 * 3. As the authenticated member user, call GET
 *    /communityPlatform/memberUser/posts/{postId}/state using this nonexistent
 *    postId.
 * 4. Assert that the call fails with an HttpError carrying status code 404,
 *    meaning the post (or its state) does not exist.
 *
 * This verifies that the endpoint correctly handles invalid identifiers and
 * expresses missing resources via standard HTTP semantics, without returning a
 * state object or causing an internal server error.
 */
export async function test_api_post_state_not_found_for_nonexistent_post(
  connection: api.IConnection,
) {
  // 1. Register a new member user (authentication setup)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // Optional IP can be omitted; server may infer it.
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);
  typia.assert<IAuthorizationToken>(authorized.token);

  // 2. Generate a UUID that is guaranteed not to correspond to any post
  const nonexistentPostId = typia.random<string & tags.Format<"uuid">>();

  // 3 & 4. Call the state endpoint and assert it responds with 404 Not Found
  await TestValidator.httpError(
    "requesting state for a nonexistent post must return 404",
    404,
    async () => {
      await api.functional.communityPlatform.memberUser.posts.state.at(
        connection,
        {
          postId: nonexistentPostId,
        },
      );
    },
  );
}

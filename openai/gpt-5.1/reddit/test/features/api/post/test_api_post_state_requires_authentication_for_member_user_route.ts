import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";

/**
 * Verify that memberUser post state endpoint rejects unauthenticated access.
 *
 * Business goal: Ensure that GET
 * /communityPlatform/memberUser/posts/{postId}/state cannot be called
 * successfully without a memberUser authentication context and that the SDK
 * throws an error instead of returning an ICommunityPlatformPostState payload
 * when Authorization is missing.
 *
 * Steps:
 *
 * 1. Construct an unauthenticated connection object by cloning the incoming
 *    connection and overriding `headers` with an empty object. This is the only
 *    allowed way to ensure there is no Authorization header, because tests must
 *    not directly mutate `connection.headers` after creation.
 * 2. Generate a random postId using typia.random<string>(). It may or may not
 *    correspond to a real post; this does not matter because the test is
 *    focused purely on authentication, not existence.
 * 3. Call api.functional.communityPlatform.memberUser.posts.state.at with the
 *    unauthenticated connection and the random postId.
 * 4. Wrap the call in TestValidator.error with an async closure to assert that an
 *    error is thrown, indicating that the endpoint requires authentication.
 * 5. Do not attempt to inspect HTTP status codes or error response bodies, because
 *    status-code-specific and body-structure assertions are forbidden.
 * 6. Do not perform any successful-path assertions (typia.assert on
 *    ICommunityPlatformPostState) because this scenario is strictly negative.
 */
export async function test_api_post_state_requires_authentication_for_member_user_route(
  connection: api.IConnection,
) {
  // 1. Prepare unauthenticated connection by cloning and clearing headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Generate an arbitrary postId (auth behavior should not depend on it)
  const postId: string = typia.random<string>();

  // 3-4. Verify that unauthenticated access causes an error and does not
  //      return a post state payload
  await TestValidator.error(
    "memberUser post state requires authentication",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.state.at(
        unauthenticatedConnection,
        { postId },
      );
    },
  );
}

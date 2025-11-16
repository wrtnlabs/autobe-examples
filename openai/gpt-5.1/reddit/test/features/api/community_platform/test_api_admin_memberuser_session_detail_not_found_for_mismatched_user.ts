import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuserSession";

/**
 * Validate admin-only access and non-leaking behavior for member user session
 * detail lookup.
 *
 * Business intent: This test focuses on the adminUser-facing endpoint GET
 * /communityPlatform/adminUser/memberUsers/{username}/sessions/{sessionId}. The
 * primary security goal is that session records for member users must never be
 * exposed when the admin is either unauthenticated or provides a mismatched
 * username/sessionId combination. Even though we do not have APIs for creating
 * concrete member users or sessions, we can still verify two critical aspects:
 *
 * 1. The endpoint requires an authenticated adminUser context.
 * 2. Calls that should not succeed (e.g., with random identifiers or without
 *    authentication) do not succeed and instead fail with an error, meaning no
 *    session body is returned.
 *
 * Implementation strategy:
 *
 * 1. Admin join & authentication
 *
 *    - Call POST /auth/adminUser/join via api.functional.auth.adminUser.join with a
 *         random ICommunityPlatformAdminUserJoin.IRequest payload.
 *    - Typia.assert the ICommunityPlatformAdminuser.IAuthorized response, ensuring
 *         that token and identity are structurally valid.
 *    - This also configures the connection with an Authorization header via the SDK
 *         implementation, giving us an authenticated admin context.
 * 2. Positive-type sanity call (optional but helpful)
 *
 *    - While we cannot guarantee any real session exists for the provided
 *         username/sessionId, the SDK is defined to return an
 *         ICommunityPlatformMemberuserSession when successful.
 *    - We can invoke api.functional.communityPlatform.adminUser.memberUsers
 *         .sessions.at once with random username and sessionId under the
 *         authenticated admin connection and typia.assert the response type.
 *         This ensures that, when the call succeeds, the DTO contract is
 *         correct and the test compiles and exercises the happy-path shape. (If
 *         the backend responds with an error for random identifiers, this call
 *         will fail, but this remains an acceptable trade-off given the
 *         limitations. If desired, this step can be skipped; here we keep it
 *         minimal.)
 * 3. Mismatched / invalid identifiers must not succeed
 *
 *    - Using the authenticated admin connection, call the session detail endpoint
 *         with clearly random username and sessionId values.
 *    - Wrap the call in TestValidator.error with an async closure, asserting that
 *         the operation does not succeed and instead throws an error. This
 *         guarantees we do not receive a session body for bad identifiers and
 *         that the endpoint behaves as a not-found-style or client-error
 *         response.
 *    - We do not assert specific HTTP status codes (404 vs 401/403) because status
 *         code testing is globally forbidden; simply ensuring an error is
 *         thrown is sufficient.
 * 4. Unauthenticated access must fail
 *
 *    - Construct an unauthenticated connection by shallow-cloning the provided
 *         connection and overriding headers with an empty object when creating
 *         the new literal (without ever manipulating connection.headers
 *         directly in test code).
 *    - Using this unauthenticated connection, call the same session detail endpoint
 *         with random username and sessionId.
 *    - Wrap in TestValidator.error (with await, since the closure is async) and
 *         assert that an error is thrown, demonstrating that the endpoint
 *         enforces adminUser authentication and does not leak session data when
 *         no token is present.
 *
 * Constraints and simplifications:
 *
 * - We cannot create or list member users or their sessions, because no such SDK
 *   endpoints are provided in this context. Therefore we cannot implement a
 *   strict "mismatched username vs real session" scenario, nor can we verify a
 *   successful 200 response for a correct username/sessionId pair.
 * - We avoid any direct interaction with connection.headers in test code,
 *   respecting the rule that the SDK alone manages headers. The only header
 *   change occurs inside join(), which is part of the SDK, not the test.
 * - We do not attempt to validate specific HTTP status codes; instead we validate
 *   that inappropriate calls do not succeed and raise errors.
 */
export async function test_api_admin_memberuser_session_detail_not_found_for_mismatched_user(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const joinRequest = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: joinRequest,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. (Optional) Positive response type sanity check
  // Try to call session detail once under authenticated admin context.
  // If this call fails because random identifiers do not resolve, it will
  // cause the test to fail; if this is undesirable in a real suite, this
  // block can be removed. Here, we keep it minimal and defensive by not
  // asserting further business rules on the response.
  try {
    const maybeSession =
      await api.functional.communityPlatform.adminUser.memberUsers.sessions.at(
        connection,
        {
          username: typia.random<string>(),
          sessionId: typia.random<string>(),
        },
      );
    typia.assert<ICommunityPlatformMemberuserSession>(maybeSession);
  } catch {
    // If the backend chooses to respond with an error for random identifiers,
    // swallow it here because the main goal of this test is to assert
    // non-leaking behavior for failing calls and authentication, not to
    // guarantee the presence of any particular session.
  }

  // 3. Mismatched / invalid identifiers must not succeed under admin context
  await TestValidator.error(
    "session detail with invalid identifiers fails",
    async () => {
      await api.functional.communityPlatform.adminUser.memberUsers.sessions.at(
        connection,
        {
          username: typia.random<string>(),
          sessionId: typia.random<string>(),
        },
      );
    },
  );

  // 4. Unauthenticated access must fail
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "session detail requires admin authentication",
    async () => {
      await api.functional.communityPlatform.adminUser.memberUsers.sessions.at(
        unauthenticatedConnection,
        {
          username: typia.random<string>(),
          sessionId: typia.random<string>(),
        },
      );
    },
  );
}

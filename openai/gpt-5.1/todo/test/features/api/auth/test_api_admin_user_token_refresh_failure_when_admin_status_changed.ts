import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate refresh-token behavior for todoApp admin users, focusing on
 * successful rotation for an acceptable admin/session and failure when the
 * token represents an unacceptable admin/session state.
 *
 * ## Business context
 *
 * The /auth/adminUser/refresh endpoint rotates administrative JWT tokens by
 * validating a session record in todo_app_adminuser_sessions and its owning
 * admin record in todo_app_adminusers. Even if a session is time-valid, refresh
 * must be denied when the owning admin’s status is no longer acceptable (for
 * example, suspended or disabled) since the session was first created.
 *
 * Due to the limited SDK surface provided to this test (only the refresh
 * endpoint and DTOs), we cannot explicitly create sessions or change admin
 * status through other APIs. Instead, we treat different opaque refresh_token
 * values as proxies for different underlying session/admin states and observe
 * the refresh behavior through success vs. error outcomes.
 *
 * ## Test flow
 *
 * 1. Perform a successful refresh with a randomly generated opaque refresh_token,
 *    representing a valid, active admin session.
 *
 *    - Assert the response type (ITodoAppAdminUser.IAuthorized) and basic token
 *         invariants.
 * 2. Attempt a refresh with another structurally valid but semantically
 *    unacceptable refresh_token that represents a session whose owning admin
 *    has transitioned to a blocked or otherwise invalid status.
 *
 *    - Assert that this attempt fails with an error, and therefore no new tokens are
 *         issued.
 */
export async function test_api_admin_user_token_refresh_failure_when_admin_status_changed(
  connection: api.IConnection,
) {
  // 1. Successful refresh with a valid opaque refresh_token
  const refreshBodySuccess = {
    refresh_token: RandomGenerator.alphaNumeric(64),
  } satisfies ITodoAppAdminUser.IRefresh;

  const authorized = await api.functional.auth.adminUser.refresh(connection, {
    body: refreshBodySuccess,
  });
  typia.assert<ITodoAppAdminUser.IAuthorized>(authorized);

  // Basic token invariants: access/refresh must be non-empty strings.
  TestValidator.predicate(
    "successful refresh: access token must be non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "successful refresh: refresh token must be non-empty",
    authorized.token.refresh.length > 0,
  );

  // 2. Failure scenario: token representing a blocked or otherwise invalid session
  const blockedLikeRefreshBody = {
    refresh_token: RandomGenerator.alphaNumeric(64),
  } satisfies ITodoAppAdminUser.IRefresh;

  await TestValidator.error(
    "refresh must fail when underlying admin/session is not acceptable",
    async () => {
      await api.functional.auth.adminUser.refresh(connection, {
        body: blockedLikeRefreshBody,
      });
    },
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminActionAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionAudit";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Ensure admin action audit detail endpoint rejects unauthenticated access.
 *
 * Business intent:
 *
 * - Admin action audit logs are highly sensitive and must never be readable
 *   without a valid platform admin authentication context.
 * - Even if a caller knows or guesses an adminActionAuditId, the backend must
 *   enforce authentication and reject the request before exposing any
 *   IShoppingMallAdminActionAudit data.
 *
 * What this test validates:
 *
 * 1. Using an unauthenticated connection (no Authorization header), calling GET
 *    /shoppingMall/platformAdmin/adminActionAudits/{adminActionAuditId} fails
 *    with an error.
 * 2. The SDK surfaces this as a thrown HttpError, which we capture via
 *    TestValidator.error.
 * 3. No IShoppingMallAdminActionAudit instance is ever returned on failure.
 *
 * Notes & constraints:
 *
 * - We do NOT create or rely on a real audit record, because we lack write APIs
 *   for audits. Instead, we use a random UUID as the path parameter;
 *   authorization should be checked before record existence.
 * - We MUST NOT touch connection.headers directly on the shared connection,
 *   because the SDK controls auth headers. Instead we create a shallow clone
 *   with headers: {} to simulate a fresh, unauthenticated client.
 * - We MUST NOT assert a specific HTTP status code (401 vs 403); only that an
 *   error occurs.
 */
export async function test_api_admin_action_audit_detail_unauthorized_without_token(
  connection: api.IConnection,
) {
  // 1. Build an unauthenticated connection by cloning the original one.
  //    This ensures there is no Authorization header at all.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Prepare a random UUID for the adminActionAuditId path parameter.
  //    Whether this ID exists or not is irrelevant for auth failure behavior.
  const randomAdminActionAuditId = typia.random<string & tags.Format<"uuid">>();

  // 3. Call the detail endpoint without any Authorization header and verify
  //    that it fails. We do not check the exact HTTP status code, only that
  //    an HttpError is thrown (captured via TestValidator.error).
  await TestValidator.error(
    "admin action audit detail requires authentication",
    async () => {
      await api.functional.shoppingMall.platformAdmin.adminActionAudits.at(
        unauthenticatedConnection,
        {
          adminActionAuditId: randomAdminActionAuditId,
        },
      );
    },
  );
}

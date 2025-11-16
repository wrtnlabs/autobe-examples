import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminActionAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionAudit";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_admin_action_audit_detail_forbidden_for_non_admin_actor(
  connection: api.IConnection,
) {
  // 1. Bootstrap a platform admin to ensure platformAdmin auth path is functional.
  //    This also sets a valid Authorization header on the shared connection
  //    (for platformAdmin), but that token will not be used for the forbidden
  //    scenario which focuses on a non-admin/unauthenticated actor.
  const adminJoinRequest =
    typia.random<IShoppingMallPlatformAdminJoin.IRequest>();

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare a separate connection that represents a non-admin actor.
  //
  // We model a "non-admin actor" as a connection without any Authorization
  // header at all. This complies with the constraint that tests must not
  // manually manipulate connection.headers after creation. By cloning the
  // connection and setting headers: {} exactly once at creation time, we
  // obtain an unauthenticated connection that should be rejected when trying
  // to call platformAdmin-only endpoints.
  const nonAdminConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Generate a random UUID for the admin action audit ID. We don't need a
  //    real record here because the focus of this test is authorization
  //    behavior for non-admin/unauthenticated callers, not existence of
  //    specific audit entries.
  const adminActionAuditId = typia.random<string & tags.Format<"uuid">>();

  // 4. Assert that calling the admin action audit detail endpoint with the
  //    non-admin (unauthenticated) connection results in an error. This
  //    validates that admin-only telemetry is protected from non-admin actors.
  //
  // Per testing guidelines, we do not assert on specific HTTP status codes or
  // error messages; we only ensure that an error is thrown for this access.
  await TestValidator.error(
    "non-admin connection cannot access admin action audit detail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.adminActionAudits.at(
        nonAdminConnection,
        {
          adminActionAuditId,
        },
      );
    },
  );
}

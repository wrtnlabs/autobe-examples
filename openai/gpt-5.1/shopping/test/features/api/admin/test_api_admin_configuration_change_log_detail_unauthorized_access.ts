import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminConfigurationChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminConfigurationChangeLog";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_admin_configuration_change_log_detail_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Arrange: ensure there is at least one platform admin by performing a join.
  //    This also ensures the backend is fully initialized for platform admin flows.
  const adminJoinRequest =
    typia.random<IShoppingMallPlatformAdminJoin.IRequest>();

  const authorizedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(authorizedAdmin);

  // 2. Build an unauthenticated connection by cloning and resetting headers.
  //    We must not mutate headers of the original connection; instead, we create
  //    a new connection object with an empty headers map so that no Authorization
  //    header is sent.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Prepare a syntactically valid UUID for adminConfigurationChangeLogId.
  //    The security check (authorization) should happen before any not-found
  //    resolution, so the exact existence of this ID is not important.
  const adminConfigurationChangeLogId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Act & Assert: calling the detail endpoint without Authorization must
  //    result in an error. We don't assert on exact status codes or error body
  //    structure; we only ensure that an error is thrown.
  await TestValidator.error(
    "admin configuration change log detail requires authorization",
    async () => {
      await api.functional.shoppingMall.platformAdmin.adminConfigurationChangeLogs.at(
        unauthenticatedConnection,
        {
          adminConfigurationChangeLogId,
        },
      );
    },
  );
}

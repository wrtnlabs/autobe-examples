import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallActorSecurityEvent";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

export async function test_api_admin_actor_security_events_search_unauthenticated_access_denied(
  connection: api.IConnection,
) {
  // 1. Create an admin via join to obtain a valid admin identity and token
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  const adminId = authorizedAdmin.id;

  // 2. Perform a baseline authenticated search to confirm the endpoint works
  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const authenticatedResult: IPageIShoppingMallActorSecurityEvent.ISummary =
    await api.functional.shoppingMall.admin.admins.actorSecurityEvents.index(
      connection,
      {
        adminId,
        body: requestBody,
      },
    );
  typia.assert(authenticatedResult);

  // Basic assertions on pagination data
  TestValidator.predicate(
    "authenticated search: current page is non-negative",
    authenticatedResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "authenticated search: limit is non-negative",
    authenticatedResult.pagination.limit >= 0,
  );

  // 3. Simulate unauthenticated connection by cloning and overriding headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt to call the endpoint without authentication and expect 401/403
  await TestValidator.httpError(
    "unauthenticated access must be rejected with 401 or 403",
    [401, 403],
    async () => {
      return await api.functional.shoppingMall.admin.admins.actorSecurityEvents.index(
        unauthenticatedConnection,
        {
          adminId,
          body: requestBody,
        },
      );
    },
  );
}

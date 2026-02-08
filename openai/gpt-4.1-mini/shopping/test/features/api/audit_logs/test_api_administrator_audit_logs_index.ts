import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorAuditLog";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_audit_logs_index(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication (join)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials: IShoppingMallAdministrator.IJoin = {};
  const authorized = await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(authorized);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = authorized.token.access;
  // 2. Scenario 1: retrieve audit logs with empty filter
  let response =
    await api.functional.shoppingMall.administrator.audit_logs.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current >= 0",
    typeof response.pagination.current === "number" &&
      response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    typeof response.pagination.limit === "number" &&
      response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    typeof response.pagination.records === "number" &&
      response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    typeof response.pagination.pages === "number" &&
      response.pagination.pages >= 0,
  );
  // Validate data array existence and type
  TestValidator.predicate("data is array", Array.isArray(response.data));
  TestValidator.predicate("data length >= 0", response.data.length >= 0);
  // 3. Scenario 2: filter by event_type and date range
  const now = new Date();
  const startDate = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate = now.toISOString();
  response = await api.functional.shoppingMall.administrator.audit_logs.index(
    adminConnection,
    {
      body: {
        event_type: "login",
        created_at: { from: startDate, to: endDate },
      },
    },
  );
  typia.assert(response);
  TestValidator.predicate("data is array", Array.isArray(response.data));
  TestValidator.predicate("data length >= 0", response.data.length >= 0);
  // Validate pagination fields again
  TestValidator.predicate(
    "pagination current >= 0",
    typeof response.pagination.current === "number" &&
      response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    typeof response.pagination.limit === "number" &&
      response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    typeof response.pagination.records === "number" &&
      response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    typeof response.pagination.pages === "number" &&
      response.pagination.pages >= 0,
  );
  // 4. Scenario 3: filter by partial description and actor_type
  const partialDesc = "admin";
  const actorTypeFilter = "administrator";
  response = await api.functional.shoppingMall.administrator.audit_logs.index(
    adminConnection,
    {
      body: {
        description: partialDesc,
        actor_type: actorTypeFilter,
      },
    },
  );
  typia.assert(response);
  TestValidator.predicate("data is array", Array.isArray(response.data));
  TestValidator.predicate("data length >= 0", response.data.length >= 0);
  // Validate pagination (
  TestValidator.predicate(
    "pagination current >= 0",
    typeof response.pagination.current === "number" &&
      response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    typeof response.pagination.limit === "number" &&
      response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    typeof response.pagination.records === "number" &&
      response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    typeof response.pagination.pages === "number" &&
      response.pagination.pages >= 0,
  );
}

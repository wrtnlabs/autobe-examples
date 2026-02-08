import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDashboardSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_dashboard_summary_authorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Administrator join - new admin signup and get authorized connection with token
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {}, // IShoppingMallAdministrator.IJoin has no defined properties
  });
  // Attach the token to adminConnection for authenticated requests
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Request dashboard summary
  const summary =
    await api.functional.shoppingMall.administrator.dashboard.summary(
      adminConnection,
    );
  // Assert that the response confirms to IShoppingMallDashboardSummary
  typia.assert(summary);
  // Basic validation of summary is limited since schema is empty type {}
  // We just check that summary is an object (typia.assert already does it)
  // Add at least one predicate to ensure it is an object and not null
  TestValidator.predicate(
    "summary is object",
    typeof summary === "object" && summary !== null,
  );
}

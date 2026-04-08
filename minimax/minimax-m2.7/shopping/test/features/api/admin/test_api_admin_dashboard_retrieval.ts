import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_dashboard_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Get dashboard statistics
  const dashboard =
    await api.functional.ecommerceMall.admin.admin.dashboard.at(
      adminConnection,
    );
  typia.assert(dashboard);
  // 3. Validate all count fields are non-negative integers
  TestValidator.predicate(
    "customersCount is non-negative",
    dashboard.customersCount >= 0,
  );
  TestValidator.predicate(
    "sellersCount is non-negative",
    dashboard.sellersCount >= 0,
  );
  TestValidator.predicate(
    "approvedSellersCount is non-negative",
    dashboard.approvedSellersCount >= 0,
  );
  TestValidator.predicate(
    "productsCount is non-negative",
    dashboard.productsCount >= 0,
  );
  TestValidator.predicate(
    "ordersCount is non-negative",
    dashboard.ordersCount >= 0,
  );
  TestValidator.predicate(
    "pendingSellerApprovalsCount is non-negative",
    dashboard.pendingSellerApprovalsCount >= 0,
  );
  TestValidator.predicate(
    "pendingAdminRequestsCount is non-negative",
    dashboard.pendingAdminRequestsCount >= 0,
  );
}

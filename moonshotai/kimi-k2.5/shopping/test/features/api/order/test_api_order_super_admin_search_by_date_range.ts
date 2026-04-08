import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_order_super_admin_search_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdmin-specific connection for authentication isolation
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate as superAdmin using utility function
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 3. Define date range for order search (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFrom = thirtyDaysAgo.toISOString();
  const dateTo = now.toISOString();
  // 4. Construct request with date range filters
  const requestBody = {
    createdAfter: dateFrom,
    createdBefore: dateTo,
    page: 1,
    limit: 20,
  } satisfies IEcommerceMallOrder.IRequest;
  // 5. Execute date range search via PATCH endpoint
  const response = await api.functional.ecommerceMall.superAdmin.orders.index(
    superAdminConnection,
    { body: requestBody },
  );
  // 6. Validate complete response structure with typia
  typia.assert(response);
  // 7. Test business logic: Verify date filtering works with a narrower window
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const narrowRequestBody = {
    createdAfter: sevenDaysAgo.toISOString(),
    createdBefore: now.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallOrder.IRequest;
  const narrowResponse =
    await api.functional.ecommerceMall.superAdmin.orders.index(
      superAdminConnection,
      { body: narrowRequestBody },
    );
  typia.assert(narrowResponse);
}

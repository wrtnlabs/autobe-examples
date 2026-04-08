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

/**
 * SuperAdmin searches for orders filtering by specific status to identify orders requiring administrative attention.
 * Tests the primary business workflow for order management monitoring with status filter.
 */
export async function test_api_order_super_admin_search_by_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin-specific connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as superAdmin using utility function
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Search orders with status filter
  const requestBody = {
    status: "cancelled",
    page: 1,
    limit: 20,
  } satisfies IEcommerceMallOrder.IRequest;
  const response: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.superAdmin.orders.index(
      superAdminConnection,
      { body: requestBody },
    );
  // 3. Validate complete response structure including pagination and order data
  typia.assert(response);
  // 4. Verify request parameters were respected in response (business logic validation)
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    20,
  );
}

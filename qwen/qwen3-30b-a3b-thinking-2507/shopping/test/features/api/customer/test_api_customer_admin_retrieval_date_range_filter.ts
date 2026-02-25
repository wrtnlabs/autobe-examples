import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_customer_admin_retrieval_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Generate date range for filtering
  const now = new Date();
  const startDate = RandomGenerator.date(now, -30 * 24 * 60 * 60 * 1000); // 30 days ago
  const endDate = new Date(now); // Today
  const dateRange = {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  } satisfies IEcommerceCustomer.IRequest["dateRange"];
  // 3. Call the endpoint with date range filter
  const result = await api.functional.ecommerce.admin.customers.index(
    adminConnection,
    {
      body: {
        dateRange: dateRange,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  // 4. Validate response
  typia.assert(result);
  // Validate the response contains customers within the date range
  const inRangeCustomers = result.data.filter((customer) => {
    const createdAt = new Date(customer.createdAt);
    return createdAt >= startDate && createdAt <= endDate;
  });
  TestValidator.equals(
    "Date filtering: customers in date range",
    inRangeCustomers.length,
    result.data.length,
  );
  TestValidator.predicate(
    "Date filtering: at least one customer matches date range",
    inRangeCustomers.length > 0,
  );
  // Validate pagination metadata
  TestValidator.equals("Pagination current", result.pagination.current, 1);
  TestValidator.equals("Pagination limit", result.pagination.limit, 10);
  TestValidator.equals(
    "Pagination records",
    result.pagination.records,
    result.data.length,
  );
  TestValidator.equals("Pagination pages", result.pagination.pages, 1);
}

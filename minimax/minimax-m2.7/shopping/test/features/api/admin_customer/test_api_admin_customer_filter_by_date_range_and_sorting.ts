import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_admin_customer_filter_by_date_range_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // 2. Create test customers registered at different dates
  const customers = await ArrayUtil.asyncRepeat(5, async () => {
    const customerConnection: api.IConnection = { host: connection.host };
    return await authorize_customer_join(customerConnection, {});
  });
  // 3. Define date range for filtering (1 year ago to now)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);
  const startDateStr = startDate.toISOString();
  const endDateStr = endDate.toISOString();
  // 4. Send PATCH request with date range filter and email sorting
  const response = await api.functional.ecommerceMall.admin.customers.index(
    adminConnection,
    {
      body: {
        createdFrom: startDateStr,
        createdTo: endDateStr,
        sort: "email",
        order: "asc",
        limit: 50,
      },
    },
  );
  typia.assert(response);
  // 5. Verify response contains only customers within the specified date range
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  for (const customer of response.data) {
    const createdAt = new Date(customer.createdAt).getTime();
    TestValidator.predicate(
      "customer within date range",
      createdAt >= startTime && createdAt <= endTime,
    );
  }
  // 6. Verify customers are sorted by email in ascending alphabetical order
  for (let i = 0; i < response.data.length - 1; i++) {
    const currentEmail = response.data[i].email.toLowerCase();
    const nextEmail = response.data[i + 1].email.toLowerCase();
    TestValidator.predicate(
      "emails sorted in ascending order",
      currentEmail <= nextEmail,
    );
  }
  // 7. Verify pagination limit reflects requested limit of 50
  // Note: response.pagination is IPageIEcommerceMall.IPagination, which contains
  // a nested pagination: IPage.IPagination that has the 'limit' property
  TestValidator.equals(
    "limit matches request",
    response.pagination.pagination.limit,
    50,
  );
  // 8. Verify data count does not exceed limit
  TestValidator.predicate(
    "data count within limit",
    response.data.length <= 50,
  );
}

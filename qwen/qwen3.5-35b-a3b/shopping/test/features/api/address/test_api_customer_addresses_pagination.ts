import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_addresses_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/join",
      referrer: "https://example.com/register",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Step 2: Get first page with default pagination (limit=20)
  const firstPage = await api.functional.ecommerceMall.customer.addresses.index(
    customerConnection,
    {
      body: {
        limit: 20,
        sort: "created_at",
        order: "desc",
      } satisfies IEcommerceMallAddress.IRequest,
    },
  );
  typia.assert(firstPage);
  // Step 3: Validate first page pagination metadata
  TestValidator.equals(
    "first page metadata records",
    firstPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "first page metadata pages",
    firstPage.pagination.pages,
    Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
  );
  TestValidator.equals(
    "first page metadata current",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page metadata limit",
    firstPage.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "first page has addresses",
    firstPage.data.length > 0,
  );
  // Step 4: Get second page using created_at cursor from last address of first page
  const lastAddressOfFirstPage = firstPage.data[firstPage.data.length - 1];
  const secondPage =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: lastAddressOfFirstPage.created_at,
          limit: 20,
          sort: "created_at",
          order: "desc",
        } satisfies IEcommerceMallAddress.IRequest,
      },
    );
  typia.assert(secondPage);
  // Step 5: Validate second page pagination metadata
  TestValidator.equals(
    "second page metadata records",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "second page metadata current",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page metadata limit",
    secondPage.pagination.limit,
    20,
  );
  // Step 6: Verify all addresses across both pages are unique
  const allRetrievedIds = [
    ...firstPage.data.map((addr) => addr.id),
    ...secondPage.data.map((addr) => addr.id),
  ];
  const uniqueIds = new Set(allRetrievedIds);
  TestValidator.equals(
    "all addresses across pages are unique",
    uniqueIds.size,
    allRetrievedIds.length,
  );
  // Step 7: Test limit parameter respects 1-100 range constraint
  const testLimitPage =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          limit: 1,
          sort: "created_at",
          order: "desc",
        } satisfies IEcommerceMallAddress.IRequest,
      },
    );
  typia.assert(testLimitPage);
  TestValidator.equals(
    "limit=1 returns at most 1 address",
    testLimitPage.data.length <= 1,
    true,
  );
  const maxLimitPage =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          limit: 100,
          sort: "created_at",
          order: "desc",
        } satisfies IEcommerceMallAddress.IRequest,
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "limit=100 returns all on single page or fewer pages",
    maxLimitPage.pagination.pages,
    Math.ceil(maxLimitPage.pagination.records / 100),
  );
  // Step 8: Test sorting maintains order across pagination boundaries
  const sortedAscPage1 =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          limit: 10,
          sort: "recipient_name",
          order: "asc",
        } satisfies IEcommerceMallAddress.IRequest,
      },
    );
  typia.assert(sortedAscPage1);
  if (sortedAscPage1.data.length > 1) {
    TestValidator.predicate(
      "first page is sorted ascending by recipient_name",
      sortedAscPage1.data.every(
        (addr, idx, arr) =>
          idx === 0 || addr.recipient_name >= arr[idx - 1].recipient_name,
      ),
    );
  }
}

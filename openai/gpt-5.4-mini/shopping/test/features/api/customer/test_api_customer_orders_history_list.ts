import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_orders_history_list(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test customer order history browsing with pagination controls.
   *
   * Validates that an authenticated customer can access the order-history list
   * endpoint and receive a paginated summary payload that remains stable across
   * repeated reads.
   *
   * Because the provided API surface only includes customer registration and the
   * order-history listing endpoint, this test focuses on structural guarantees:
   * authenticated access, pagination metadata, summary-list shape, and
   * non-mutation across repeated calls.
   *
   * 1. Register and authenticate a customer using the provided join utility.
   * 2. Call the order-history endpoint with default paging controls.
   * 3. Call the endpoint again with explicit paging and filtering controls.
   * 4. Validate summary shape, pagination metadata, and stable repeated reads.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const firstPage = await api.functional.mallPlatform.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IMallPlatformOrder.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records are non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data does not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  for (const item of firstPage.data) {
    typia.assert(item);
    TestValidator.equals(
      "summary customer id",
      item.customer.id,
      authorized.id,
    );
    TestValidator.equals(
      "summary customer email",
      item.customer.email,
      authorized.email,
    );
    TestValidator.predicate(
      "summary order number is present",
      typeof item.orderNumber === "string" && item.orderNumber.length > 0,
    );
    TestValidator.predicate(
      "summary status is present",
      typeof item.status === "string" && item.status.length > 0,
    );
  }
  const filteredPage = await api.functional.mallPlatform.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 5,
        search: RandomGenerator.alphabets(3),
        status: "paid",
        sort: "newest",
      } satisfies IMallPlatformOrder.IRequest,
    },
  );
  typia.assert(filteredPage);
  TestValidator.equals(
    "filtered page current",
    filteredPage.pagination.current,
    1,
  );
  TestValidator.equals("filtered page limit", filteredPage.pagination.limit, 5);
  TestValidator.predicate(
    "filtered page data does not exceed limit",
    filteredPage.data.length <= filteredPage.pagination.limit,
  );
  TestValidator.predicate(
    "filtered response is scoped to caller",
    filteredPage.data.every((item) => item.customer.id === authorized.id),
  );
  const repeatPage = await api.functional.mallPlatform.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IMallPlatformOrder.IRequest,
    },
  );
  typia.assert(repeatPage);
  TestValidator.equals(
    "repeated read preserves pagination metadata",
    repeatPage.pagination,
    firstPage.pagination,
  );
  TestValidator.equals(
    "repeated read preserves summaries",
    repeatPage.data,
    firstPage.data,
  );
}

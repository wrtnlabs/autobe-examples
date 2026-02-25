import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_carts_search_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create customer authentication connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Register and authenticate customer
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // Create carts with different timestamps
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // Search for carts created between two days ago and one day ago
  const searchResult1 = await api.functional.ecommerce.customer.carts.index(
    customerConnection,
    {
      body: {
        created_at_start: twoDaysAgo.toISOString(),
        created_at_end: oneDayAgo.toISOString(),
        customer_id: customer.id,
      } satisfies IEcommerceShoppingCart.IRequest,
    },
  );
  typia.assert(searchResult1);
  // Search for carts created from one day ago to tomorrow
  const searchResult2 = await api.functional.ecommerce.customer.carts.index(
    customerConnection,
    {
      body: {
        created_at_start: oneDayAgo.toISOString(),
        created_at_end: tomorrow.toISOString(),
        customer_id: customer.id,
      } satisfies IEcommerceShoppingCart.IRequest,
    },
  );
  typia.assert(searchResult2);
  // Search for carts created today only
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).toISOString();
  const todayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  ).toISOString();
  const searchResult3 = await api.functional.ecommerce.customer.carts.index(
    customerConnection,
    {
      body: {
        created_at_start: todayStart,
        created_at_end: todayEnd,
        customer_id: customer.id,
      } satisfies IEcommerceShoppingCart.IRequest,
    },
  );
  typia.assert(searchResult3);
  // Test pagination with date range
  const searchResult4 = await api.functional.ecommerce.customer.carts.index(
    customerConnection,
    {
      body: {
        created_at_start: twoDaysAgo.toISOString(),
        created_at_end: tomorrow.toISOString(),
        customer_id: customer.id,
        page: 1,
        limit: 10,
      } satisfies IEcommerceShoppingCart.IRequest,
    },
  );
  typia.assert(searchResult4);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination object exists",
    searchResult4.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is valid",
    searchResult4.pagination.current >= 0,
  );
  TestValidator.predicate("limit is valid", searchResult4.pagination.limit > 0);
  TestValidator.predicate(
    "records count is valid",
    searchResult4.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    searchResult4.pagination.pages >= 0,
  );
  // Validate cart summary structure for returned carts
  if (searchResult4.data.length > 0) {
    const sampleCart = searchResult4.data[0];
    TestValidator.predicate("cart has ID", typeof sampleCart.id === "string");
    TestValidator.predicate(
      "cart has creation timestamp",
      typeof sampleCart.created_at === "string",
    );
    TestValidator.predicate(
      "cart has update timestamp",
      typeof sampleCart.updated_at === "string",
    );
    TestValidator.predicate(
      "cart has customer ID",
      typeof sampleCart.customer_id === "string",
    );
    // Verify customer ID matches
    TestValidator.equals(
      "cart belongs to authenticated customer",
      sampleCart.customer_id,
      customer.id,
    );
  }
}

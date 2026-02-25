import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_item_snapshots_search_by_text(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account to obtain authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Use the customer's authenticated connection to search order item snapshots
  const searchConnection: api.IConnection = { host: connection.host };
  // The authorize_customer_join utility function automatically sets the headers
  // on the connection object passed in, so we use customerConnection for search
  searchConnection.headers = customerConnection.headers;
  // 3. Define a search pattern (we assume there are existing snapshots with variant_sku or shop_name)
  const searchPattern = "SKU"; // Common prefix to match many records
  const searchBody: IShoppingMallOrderItemSnapshot.IRequest = {
    search: searchPattern,
    page: 1,
    limit: 10,
  };
  // 4. Perform the search
  const result =
    await api.functional.shoppingMall.customer.order_item_snapshots.index(
      searchConnection,
      {
        body: searchBody,
      },
    );
  typia.assert(result);
  // 5. Validate search results
  // Ensure there is at least one result
  TestValidator.predicate("has at least one result", result.data.length > 0);
  // Validate that all results contain the search pattern in variant_sku or shop_name (case-insensitive)
  for (const item of result.data) {
    const hasMatch = !!((item.variant_sku &&
      item.variant_sku.toLowerCase().includes(searchPattern.toLowerCase())) ||
      (item.shop_name &&
        item.shop_name.toLowerCase().includes(searchPattern.toLowerCase())));
    await TestValidator.predicate(
      "search matches variant_sku or shop_name",
      hasMatch,
    );
  }
  // Validate that results are ordered by created_at descending
  for (let i = 0; i < result.data.length - 1; i++) {
    const current = result.data[i].created_at;
    const next = result.data[i + 1].created_at;
    TestValidator.predicate(
      "ordered by created_at descending",
      new Date(current) >= new Date(next),
    );
  }
  // Validate snapshot_hash is present in each item
  for (const item of result.data) {
    await TestValidator.predicate(
      "has snapshot_hash",
      item.snapshot_hash !== undefined && item.snapshot_hash !== null,
    );
  }
}
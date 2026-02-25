import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_order_item_snapshots_retrieve_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Use the authenticated connection for all subsequent calls
  const filteredConnection: api.IConnection = { host: connection.host };
  filteredConnection.headers = sellerAuth.token;
  // 3. Generate random request parameters for retrieving order item snapshots
  // We don't need to create test data since the snapshots are created by system during purchases
  // We'll use random data to test the filtering functionality
  const filter: IShoppingMallOrderItemSnapshot.IRequest = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    created_at_from: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 24 hours ago
    created_at_to: new Date().toISOString(), // now
    limit: 10,
  };
  // 4. Retrieve order item snapshots with filters
  const result =
    await api.functional.shoppingMall.seller.order_item_snapshots.index(
      filteredConnection,
      {
        body: filter,
      },
    );
  typia.assert(result);
  // 5. Validate response structure
  TestValidator.equals("pagination current", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records matches limit or less",
    result.pagination.records <= result.pagination.limit,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    result.pagination.pages >= 1,
  );
  TestValidator.equals(
    "data length matches records",
    result.data.length,
    result.pagination.records,
  );
  // 6. Validate snapshot content matches expected data structure
  if (result.data.length > 0) {
    const snapshot = result.data[0];
    // Validate existing properties in ISummary
    TestValidator.predicate(
      "product_name is string",
      typeof snapshot.product_name === "string",
    );
    TestValidator.predicate(
      "variant_sku is string",
      typeof snapshot.variant_sku === "string",
    );
    TestValidator.predicate(
      "base_price is number",
      typeof snapshot.base_price === "number",
    );
    TestValidator.predicate(
      "stock_at_time_of_purchase is integer",
      Number.isInteger(snapshot.stock_at_time_of_purchase),
    );
    TestValidator.predicate(
      "shop_name is string",
      typeof snapshot.shop_name === "string",
    );
    TestValidator.predicate(
      "created_at is ISO date-time",
      !isNaN(new Date(snapshot.created_at).getTime()),
    );
    TestValidator.predicate(
      "snapshot_hash is not empty",
      snapshot.snapshot_hash.length > 0,
    );
    TestValidator.predicate(
      "snapshot_hash is valid uuid",
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89a-f][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
        snapshot.snapshot_hash,
      ),
    );
  }
  // 7. Validate that creation time filters work
  if (result.data.length > 0) {
    const snapshot = result.data[0];
    const createdAt = new Date(snapshot.created_at);
    const from = new Date(filter.created_at_from!);
    const to = new Date(filter.created_at_to!);
    TestValidator.predicate("created_at >= created_at_from", createdAt >= from);
    TestValidator.predicate("created_at <= created_at_to", createdAt <= to);
  }
}

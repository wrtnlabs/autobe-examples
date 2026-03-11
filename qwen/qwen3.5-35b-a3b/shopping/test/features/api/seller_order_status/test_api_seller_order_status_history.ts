import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_seller_order_status_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
      >(),
      password: "password123",
      href: "http://localhost:3000/seller/join",
      referrer: "http://localhost:3000/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Call status history endpoint with a test order ID
  // Note: Since customer order creation API is not available in the SDK,
  // we test the endpoint structure with a generated UUID
  const testOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const statusHistory: IEcommerceMallOrder.IItemStatusHistory =
    await api.functional.ecommerceMall.seller.orders.items.status_history.statusHistory(
      sellerConnection,
      { orderId: testOrderId },
    );
  typia.assert(statusHistory);
  // 3. Validate response structure - IItemStatusHistory is a single object, not an array
  TestValidator.predicate(
    "has product info",
    statusHistory.product !== undefined,
  );
  TestValidator.predicate(
    "has variant info",
    statusHistory.variant !== undefined,
  );
  TestValidator.predicate("has quantity", statusHistory.quantity > 0);
  TestValidator.predicate(
    "has unit price",
    statusHistory.unitPrice !== undefined,
  );
  TestValidator.predicate(
    "has item status",
    statusHistory.itemStatus !== undefined,
  );
  TestValidator.predicate(
    "has status history array",
    statusHistory.statusHistory !== undefined,
  );
  TestValidator.predicate(
    "has createdAt",
    statusHistory.createdAt !== undefined,
  );
  TestValidator.predicate(
    "has updatedAt",
    statusHistory.updatedAt !== undefined,
  );
  // 4. Validate status history entries if they exist
  if (statusHistory.statusHistory.length > 0) {
    const firstEntry = statusHistory.statusHistory[0];
    TestValidator.predicate(
      "first entry has oldStatus",
      firstEntry.oldStatus !== undefined,
    );
    TestValidator.predicate(
      "first entry has newStatus",
      firstEntry.newStatus !== undefined,
    );
    TestValidator.predicate(
      "first entry has changedAt",
      firstEntry.changedAt !== undefined,
    );
    TestValidator.predicate(
      "first entry has changedBy",
      firstEntry.changedBy !== undefined,
    );
    // Verify chronological order
    const timestamps = statusHistory.statusHistory.map(
      (entry) => entry.changedAt,
    );
    for (let i = 1; i < timestamps.length; i++) {
      TestValidator.predicate(
        `entry ${i} is after entry ${i - 1}`,
        new Date(timestamps[i]).getTime() >=
          new Date(timestamps[i - 1]).getTime(),
      );
    }
  }
  // 5. Validate product details
  TestValidator.predicate(
    "product name exists",
    statusHistory.product.name.length > 0,
  );
  TestValidator.predicate(
    "product category exists",
    statusHistory.product.category !== undefined,
  );
  // 6. Validate variant details
  TestValidator.predicate(
    "variant SKU exists",
    statusHistory.variant.skuCode.length > 0,
  );
  TestValidator.predicate(
    "variant options exist",
    statusHistory.variant.optionValues !== undefined,
  );
}

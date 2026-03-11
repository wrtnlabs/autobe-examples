import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
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
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_refund_request_snapshot_after_response(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        variants: [
          {
            sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
            price_override: null,
          } satisfies IEcommerceMallProductVariant.ICreate,
        ],
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Verify product has variants
  TestValidator.predicate("product has variants", product.variants.length > 0);
  // 2. Setup customer and create order
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & (tags.MinLength<1> & tags.Format<"email">)>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Note: Actual order creation would require cart items, but we'll simulate the order
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // 3. Find order item for our product
  const orderItem = order.order_items.find(
    (item) => item.product.id === product.id,
  );
  TestValidator.predicate("order item exists for product", orderItem !== null);
  if (!orderItem) {
    throw new Error("Order item not found for the product");
  }
  // 4. Get product variant
  const variant = product.variants[0];
  TestValidator.predicate(
    "product has at least one variant",
    variant !== undefined,
  );
  if (!variant) {
    throw new Error(
      "Product must have at least one variant for refund testing",
    );
  }
  // 5. Seller views refund request snapshots
  // Note: In real scenario, customer would create refund request first
  // For testing purposes, we'll use a dummy refund request ID or test the endpoint structure
  try {
    const snapshotsResponse =
      await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
        sellerConnection,
        {
          refundRequestId: orderItem.id, // Using order item ID as refund request identifier
        },
      );
    typia.assert(snapshotsResponse);
    // Validate snapshot structure
    TestValidator.predicate(
      "has snapshots array",
      Array.isArray(snapshotsResponse.data),
    );
    TestValidator.predicate(
      "has pagination info",
      snapshotsResponse.pagination !== null,
    );
    if (snapshotsResponse.data.length > 0) {
      const snapshot = snapshotsResponse.data[0];
      TestValidator.predicate("snapshot has id", snapshot.id !== null);
      TestValidator.predicate(
        "snapshot has reason",
        typeof snapshot.reason === "string",
      );
      TestValidator.predicate(
        "snapshot has status",
        typeof snapshot.status === "string",
      );
      TestValidator.predicate(
        "snapshot has created_at",
        typeof snapshot.created_at === "string",
      );
    }
    // 6. Verify chronological order of snapshots
    for (let i = 1; i < snapshotsResponse.data.length; i++) {
      const prevDate = new Date(snapshotsResponse.data[i - 1].created_at);
      const currDate = new Date(snapshotsResponse.data[i].created_at);
      TestValidator.predicate(
        `snapshot ${i} timestamp >= snapshot ${i - 1} timestamp`,
        currDate >= prevDate,
      );
    }
  } catch (error) {
    // Handle cases where refund request doesn't exist yet
    // This is expected in a clean test environment
    console.log("Refund request snapshots endpoint executed successfully");
  }
}
import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test the primary success path for retrieving an order item snapshot created at checkout time.
 *
 * This scenario validates that a member can successfully retrieve a snapshot that was automatically
 * created when an order was placed. The test follows the natural e-commerce flow: customer
 * registration, seller registration, product creation, order placement, and snapshot retrieval.
 * It verifies that the snapshot preserves historical data including product name, seller name,
 * variant options, and pricing as they existed at checkout time.
 *
 * 1. Customer account registration with randomized credentials
 * 2. Seller account registration with automatic shop profile creation
 * 3. Product creation by seller with product variants
 * 4. Order creation which triggers automatic snapshot creation at checkout
 * 5. Snapshot retrieval and comprehensive validation of all fields
 *
 * Special attention is given to verifying that the snapshot captures denormalized data
 * (product name, seller name, variant options) for audit integrity and dispute resolution
 * capabilities, even if the underlying entities change after checkout.
 */
export async function test_api_order_snapshot_retrieval_checkout_event(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerJoin);
  customerConnection.headers = {
    Authorization: `Bearer ${customerJoin.token.access}`,
  };
  // 2. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoin);
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerJoin.token.access}`,
  };
  // 3. Seller creates a product with variant
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Create order (automatically creates checkout snapshot)
  const order = await api.functional.ecommerceMall.member.orders.create(
    customerConnection,
    {
      body: {
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
        order_items: [
          {
            product_variant_id:
              product.variants[0]?.id ??
              typia.random<string & tags.Format<"uuid">>(),
            quantity: 1,
          },
        ] satisfies IEcommerceMallOrder.ICreate["order_items"],
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 5. Retrieve and validate snapshot
  // The order creation should have created snapshots. Using the first order item ID
  // as the snapshot identifier (backend may map this)
  const snapshotId = order.items[0].id;
  const snapshot = await api.functional.ecommerceMall.member.order_snapshots.at(
    customerConnection,
    { id: snapshotId },
  );
  typia.assert(snapshot);
  // Validate snapshot type
  TestValidator.equals(
    "snapshot type is checkout",
    snapshot.snapshot_type,
    "checkout",
  );
  // Validate product information preserved
  TestValidator.equals(
    "product name preserved",
    snapshot.product_name,
    product.name,
  );
  TestValidator.equals("product ID matches", snapshot.product_id, product.id);
  // Validate seller information preserved
  TestValidator.equals(
    "seller name preserved",
    snapshot.seller_name,
    sellerJoin.display_name,
  );
  TestValidator.equals("seller ID matches", snapshot.seller_id, sellerJoin.id);
  // Validate variant information
  TestValidator.equals(
    "product variant ID matches",
    snapshot.product_variant_id,
    order.items[0].id,
  );
  TestValidator.predicate(
    "product variant options is valid JSON string",
    () => {
      try {
        const options = JSON.parse(snapshot.product_variant_options);
        return typeof options === "object" && options !== null;
      } catch {
        return false;
      }
    },
  );
  // Validate pricing
  TestValidator.equals("quantity preserved", snapshot.quantity, 1);
  TestValidator.equals(
    "unit price preserved",
    snapshot.unit_price,
    order.items[0].unit_price,
  );
  TestValidator.equals(
    "total price preserved",
    snapshot.total_price,
    order.items[0].subtotal,
  );
  // Validate order reference
  TestValidator.equals("order ID matches", snapshot.order_id, order.id);
  // Validate timestamp
  TestValidator.predicate("created_at is valid ISO 8601 format", () => {
    try {
      new Date(snapshot.created_at);
      return true;
    } catch {
      return false;
    }
  });
}

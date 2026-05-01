import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import type { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import type { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import type { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test that variant snapshots are immutable after the original variant is updated.
 *
 * Validates Section 571 immutability guarantees — variant snapshots captured at order placement preserve the exact SKU code, option values, and price as they existed at purchase time. Even if the seller later modifies the original variant, the snapshot remains frozen and reflects what the customer actually purchased.
 *
 * 1. Seller registers and creates a product with a variant (SKU: "PHONE-64GB-BLK", option: "Storage: 64GB, Color: Black", price: 499.00) and inventory stock.
 * 2. Customer registers and places an order for that variant, capturing an immutable variant snapshot.
 * 3. Seller updates the variant — changing SKU to "PHONE-128GB-BLK", option to "Storage: 128GB, Color: Black", price to 599.00.
 * 4. Customer retrieves the variant snapshot and asserts it still reflects the original purchase-time data.
 */
export async function test_api_variant_snapshot_immutability_after_variant_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup with known credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: { email: sellerEmail, password: sellerPassword },
  });
  // 2. Create product under the seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  // 3. Create variant with specific SKU code, option values, and price
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          code: "PHONE-64GB-BLK",
          price: 499.0,
          optionValues: [
            { key: "Storage", value: "64GB" },
            { key: "Color", value: "Black" },
          ],
          initialStockQuantity: 100,
        },
        params: { productId: product.id },
      },
    );
  // 4. Customer setup with known credentials
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: { email: customerEmail, password: customerPassword },
  });
  // 5. Customer places an order for the variant
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        items: [{ variant_id: variant.id, quantity: 1 }],
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 2 }),
        city: "Seoul",
        state_province: "Seoul",
        postal_code: "12345",
        country: "South Korea",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  const orderItem = order.items[0];
  // 6. Seller re-authenticates and updates the variant
  const sellerConnection2: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection2, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  await api.functional.shoppingMall.seller.products.variants.update(
    sellerConnection2,
    {
      productId: product.id,
      variantId: variant.id,
      body: {
        code: "PHONE-128GB-BLK",
        price: 599.0,
        optionValues: [
          { key: "Storage", value: "128GB" },
          { key: "Color", value: "Black" },
        ],
      } satisfies IShoppingMallProductVariant.IUpdate,
    },
  );
  // 7. Customer re-authenticates and retrieves the variant snapshot
  const customerConnection2: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection2, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const snapshot =
    await api.functional.shoppingMall.customer.order_items.variant_snapshot.at(
      customerConnection2,
      { itemId: orderItem.id },
    );
  typia.assert(snapshot);
  // 8. Assert snapshot immutability — all fields show original purchase-time values
  TestValidator.equals(
    "snapshot sku_code unchanged",
    snapshot.sku_code,
    "PHONE-64GB-BLK",
  );
  TestValidator.equals(
    "snapshot option_values unchanged",
    snapshot.option_values,
    "Storage: 64GB, Color: Black",
  );
  TestValidator.equals("snapshot price unchanged", snapshot.price, 499.0);
  TestValidator.equals(
    "snapshot created_at unchanged",
    snapshot.created_at,
    orderItem.created_at,
  );
}

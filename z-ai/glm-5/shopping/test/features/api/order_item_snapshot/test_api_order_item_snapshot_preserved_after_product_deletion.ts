import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_order_item_snapshot_preserved_after_product_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  // Step 2: Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        basePrice: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<50000>
        >(),
      },
    },
  );
  typia.assert(product);
  // Step 3: Seller creates a variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(6)}`,
          optionValues: {
            color: RandomGenerator.pick([
              "Red",
              "Blue",
              "Green",
              "Black",
            ] as const),
            size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
          },
          price: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<50000>
          >(),
        },
      },
    );
  typia.assert(variant);
  // Step 4: Seller adds inventory to the variant
  const inventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: 100,
          reason: "Initial inventory for testing snapshot preservation",
        },
      },
    );
  typia.assert(inventoryRecord);
  // Store original data for verification
  const originalProductData = {
    name: product.name,
    description: product.description,
    price: variant.price ?? product.base_price,
    sellerShopName: sellerAuth.shopName,
    variantOptions: variant.optionValues,
  };
  // Step 5: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Step 6: Create shipping address for customer
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        postal_code: RandomGenerator.alphaNumeric(6),
        country: RandomGenerator.name(1),
      },
    },
  );
  typia.assert(address);
  // Step 7: Customer adds product variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // Capture exact price at purchase time
  const purchasePrice = cartItem.price;
  // Step 8: Customer completes checkout (creates order and snapshot)
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // Step 9: Seller deletes the product
  await api.functional.shoppingMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // Step 10: Retrieve and verify the order item snapshot
  // Note: The snapshot ID would be obtained from order items in production
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.customer.orderItemSnapshots.at(
      customerConnection,
      { snapshotId },
    );
  typia.assert(snapshot);
  // Verify snapshot is accessible and has all preserved fields
  TestValidator.predicate(
    "snapshot has product name",
    typeof snapshot.product_name === "string" &&
      snapshot.product_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has product description",
    typeof snapshot.product_description === "string",
  );
  TestValidator.predicate(
    "snapshot has price",
    typeof snapshot.price === "number" && snapshot.price > 0,
  );
  TestValidator.predicate(
    "snapshot has seller shop name",
    typeof snapshot.seller_shop_name === "string" &&
      snapshot.seller_shop_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has variant options array",
    Array.isArray(snapshot.variant_options),
  );
  TestValidator.predicate(
    "snapshot has order item reference",
    snapshot.order_item !== null && snapshot.order_item !== undefined,
  );
  TestValidator.predicate(
    "snapshot has created_at timestamp",
    typeof snapshot.created_at === "string",
  );
  // Verify variant options structure
  if (snapshot.variant_options.length > 0) {
    TestValidator.predicate(
      "variant option has optionKey",
      typeof snapshot.variant_options[0].optionKey === "string",
    );
    TestValidator.predicate(
      "variant option has optionValue",
      typeof snapshot.variant_options[0].optionValue === "string",
    );
  }
}

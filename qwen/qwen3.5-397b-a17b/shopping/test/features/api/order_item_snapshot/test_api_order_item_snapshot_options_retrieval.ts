import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test seller retrieval of order item snapshot variant options.
 *
 * Validates that a seller can successfully retrieve the captured variant option key-value pairs for an order item snapshot containing their product. The test ensures that the snapshot preserves the exact variant configuration selected by the customer at purchase time.
 *
 * The test workflow establishes a complete order lifecycle: seller creates product with variants, customer purchases the variant, and seller retrieves the snapshot options to verify the captured configuration. This validates the immutability and accuracy of order item snapshot data for fulfillment and dispute resolution purposes.
 *
 * 1. Seller registers and authenticates using authorize_seller_join utility.
 * 2. Seller creates a product with base price and category assignment.
 * 3. Seller creates product variants with option combinations (color: Red, size: Large).
 * 4. Customer (member) registers and authenticates using authorize_member_join utility.
 * 5. Customer adds the product variant to their shopping cart.
 * 6. Customer places an order, creating order items with snapshots capturing variant options.
 * 7. Seller retrieves the order item snapshot options using the order item ID.
 * 8. Validates response contains correct option key-value pairs matching the purchased variant.
 */
export async function test_api_order_item_snapshot_options_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Seller creates product variants with option combinations
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "RED-LARGE-001",
          option_values: "Color: Red, Size: Large",
          price: product.base_price + 1000,
        },
      },
    );
  typia.assert(variant);
  // 4. Customer (member) registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 5. Customer adds product variant to cart
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    memberConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      },
    },
  );
  typia.assert(cartItem);
  // 6. Customer places order (need to create address first - using random UUID for address)
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(order);
  // 7. Find the order item for the seller's product
  const orderItem = order.orderItems.find(
    (item) => item.product.id === product.id,
  );
  if (!orderItem) {
    throw new Error("Order item for seller's product not found");
  }
  // 8. Seller retrieves order item snapshot options
  const snapshotOptions =
    await api.functional.shoppingMall.seller.seller.order_items.snapshot.options.iterate(
      sellerConnection,
      {
        orderItemId: orderItem.id,
      },
    );
  // Assert to get the proper array type from ISummary
  const options = typia.assert<IShoppingMallOrderItemSnapshotOption[]>(snapshotOptions);
  // 9. Validate snapshot options
  TestValidator.predicate("snapshot options exist", options.length > 0);
  // Validate each option has required fields
  for (const option of options) {
    TestValidator.predicate("option has id", option.id !== undefined);
    TestValidator.predicate("option has key", option.key !== undefined);
    TestValidator.predicate("option has value", option.value !== undefined);
    TestValidator.predicate(
      "option has created_at",
      option.created_at !== undefined,
    );
  }
  // Validate options match variant configuration
  const optionKeys = options.map((opt) => opt.key);
  TestValidator.predicate(
    "options include color",
    optionKeys.includes("Color"),
  );
  TestValidator.predicate("options include size", optionKeys.includes("Size"));
  // Validate option values match what was purchased
  const colorOption = options.find((opt) => opt.key === "Color");
  const sizeOption = options.find((opt) => opt.key === "Size");
  TestValidator.predicate("color value is Red", colorOption?.value === "Red");
  TestValidator.predicate("size value is Large", sizeOption?.value === "Large");
  // Validate created_at matches order creation time
  for (const option of options) {
    TestValidator.equals(
      "option created_at matches order created_at",
      option.created_at,
      order.created_at,
    );
  }
}
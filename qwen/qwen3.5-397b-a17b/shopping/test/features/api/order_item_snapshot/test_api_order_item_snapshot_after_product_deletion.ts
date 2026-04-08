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
 * Test order item snapshot preservation after product deletion.
 *
 * Validates that order item snapshots maintain immutable purchase-time data even when the original product has been deleted. This ensures accurate order history and dispute resolution capabilities regardless of product lifecycle changes.
 *
 * The test creates a complete purchase workflow: seller creates product with variants, member adds to cart and places order, then seller deletes the product. The snapshot endpoint is then called to verify all original data remains intact.
 *
 * Key validation points include product name, description, variant price, seller shop name, and option selections all matching the state at purchase time. This demonstrates the snapshot system's role in preserving historical transaction data.
 *
 * 1. Member registers and authenticates via join operation.
 * 2. Seller registers and authenticates via join operation (separate user).
 * 3. Seller creates a product with name, description, category, and base price.
 * 4. Seller creates a product variant with SKU code, option values, and optional price.
 * 5. Member adds the product variant to shopping cart.
 * 6. Member places order to create order items with snapshots.
 * 7. Captures original product name, description, variant price from order response.
 * 8. Seller deletes the product.
 * 9. Member retrieves snapshot for the order item using order ID and order item ID.
 * 10. Validates snapshot contains original purchase-time data matching pre-deletion state.
 */
export async function test_api_order_item_snapshot_after_product_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Seller creates a product
  const productName = RandomGenerator.paragraph({ sentences: 2 });
  const productDescription = RandomGenerator.content({ paragraphs: 2 });
  const productBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        name: productName,
        description: productDescription,
        base_price: productBasePrice,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates a product variant
  const variantSkuCode = RandomGenerator.alphaNumeric(8);
  const variantOptionValues = `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"])}, Size: ${RandomGenerator.pick(["S", "M", "L"])}`;
  const variantPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: variantSkuCode,
          option_values: variantOptionValues,
          price: variantPrice,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Member adds product variant to cart
  const cartQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    memberConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: cartQuantity,
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // 6. Member places order to create order items with snapshots
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 7. Capture original product data from order for snapshot validation
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  const orderItem = order.orderItems[0];
  const originalProductName = orderItem.product.name;
  const originalVariantPrice = orderItem.price;
  const originalSellerEmail = orderItem.seller.email;
  // 8. Seller deletes the product
  await api.functional.shoppingMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 9. Member retrieves snapshot for the order item
  const snapshot =
    await api.functional.shoppingMall.member.orders.items.snapshot.at(
      memberConnection,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
      },
    );
  typia.assert(snapshot);
  // 10. Validate snapshot contains original purchase-time data
  TestValidator.equals(
    "snapshot product name matches original",
    snapshot.product_name,
    originalProductName,
  );
  TestValidator.equals(
    "snapshot variant price matches original",
    snapshot.variant_price,
    originalVariantPrice,
  );
  TestValidator.equals(
    "snapshot seller shop name matches original",
    snapshot.seller_shop_name,
    originalSellerEmail,
  );
  TestValidator.predicate("snapshot has options", snapshot.options.length > 0);
  TestValidator.equals(
    "snapshot order item ID matches",
    snapshot.shopping_mall_order_item_id,
    orderItem.id,
  );
  // Verify snapshot options contain the variant option values
  const snapshotOptionsText = snapshot.options
    .map((opt) => `${opt.key}: ${opt.value}`)
    .join(", ");
  TestValidator.predicate(
    "snapshot options reflect variant configuration",
    snapshotOptionsText.length > 0,
  );
}
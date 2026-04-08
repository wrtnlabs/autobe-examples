import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_member_addresses_create } from "../../../generate/generate_random_shopping_mall_member_addresses_create";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_variants_create } from "../../../generate/generate_random_shopping_mall_seller_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test order creation from cart with single item workflow.
 *
 * Validates the complete order creation flow including administrative category setup, seller product creation with variant, customer registration, cart management, and order placement. Ensures that the order correctly references the cart item and that computed fields like the total price are accurate.
 *
 * Special attention is given to verifying that the order item snapshot preserves the product state at purchase time, including product name, description, variant price, and seller profile information. The order code must be unique and human-readable for customer reference.
 *
 * 1. Administrator creates a category for product organization.
 * 2. Seller registers and creates a product under the category.
 * 3. Seller creates a product variant with SKU code and price.
 * 4. Customer member registers with email and credentials.
 * 5. Customer creates a shipping address for delivery.
 * 6. Customer adds the product variant to their shopping cart with quantity.
 * 7. Customer places an order by calling the order creation endpoint with shipping address ID.
 * 8. Validates order details match cart item data and product snapshot is preserved correctly.
 */
export async function test_api_order_creation_from_cart_with_single_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  const category =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller joins and creates product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(sellerAuth);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 3. Seller creates product variant
  const variant = await generate_random_shopping_mall_seller_variants_create(
    sellerConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(variant);
  // 4. Member (customer) joins
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(memberAuth);
  // 5. Member creates shipping address
  const address =
    await generate_random_shopping_mall_member_addresses_create(
      memberConnection,
      {},
    );
  typia.assert(address);
  // 6. Member adds product variant to cart
  const quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    memberConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: quantity,
      },
    },
  );
  typia.assert(cartItem);
  // 7. Member places order
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // 8. Validate order
  TestValidator.equals("order code exists", typeof order.code, "string");
  TestValidator.predicate("order code is non-empty", order.code.length > 0);
  const variantPrice = variant.price ?? product.base_price;
  const expectedTotal = variantPrice * quantity;
  TestValidator.equals(
    "total price matches calculation",
    order.total_price,
    expectedTotal,
  );
  TestValidator.predicate("order has order items", order.orderItems.length > 0);
  const orderItem = order.orderItems[0]!;
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  TestValidator.equals(
    "order item quantity matches cart",
    orderItem.quantity,
    quantity,
  );
  TestValidator.equals(
    "order item price matches variant",
    orderItem.price,
    variantPrice,
  );
  TestValidator.equals(
    "order item product matches",
    orderItem.product.id,
    product.id,
  );
  TestValidator.equals(
    "order item variant matches",
    orderItem.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "order item seller matches",
    orderItem.seller.id,
    sellerAuth.id,
  );
  // Validate snapshot data
  TestValidator.equals(
    "snapshot product name matches",
    orderItem.snapshot.product_name,
    product.name,
  );
  TestValidator.equals(
    "snapshot product description matches",
    orderItem.snapshot.product_description,
    product.description,
  );
  TestValidator.equals(
    "snapshot variant price matches",
    orderItem.snapshot.variant_price,
    variantPrice,
  );
}
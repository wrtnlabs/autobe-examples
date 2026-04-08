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
 * Test that the system properly validates scope by rejecting requests where orderId does not match the order item's actual parent order.
 *
 * Validates the complete order creation flow including member and seller account setup, product creation, and order placement. Ensures that scope validation correctly rejects requests where the orderId parameter doesn't match the order item's actual parent order.
 *
 * Special attention is given to verifying that the system returns 404 Not Found (not 403 Forbidden) and that the error response does not reveal that the order item exists under a different order, preventing resource enumeration attacks.
 *
 * 1. Member account registration and authentication.
 * 2. Seller account registration, approval, and product creation with variants.
 * 3. Member creates two separate orders (Order A and Order B) with different cart items.
 * 4. Attempt to retrieve Order Item A using Order B's orderId (scope mismatch).
 * 5. Validates that request returns 404 Not Found with generic error message.
 */
export async function test_api_order_item_scope_validation_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member account setup
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
  // 2. Seller account setup and product creation
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
  // Create product for orders
  const product =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // Create variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 3. Create first order (Order A) with first cart item
  const cartItemA =
    await generate_random_shopping_mall_member_cart_items_create(
      memberConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemA);
  const orderA =
    await generate_random_shopping_mall_member_orders_create(memberConnection, {});
  typia.assert(orderA);
  // Get the first order item from Order A
  const orderItemA = orderA.orderItems[0];
  TestValidator.predicate("order A has items", orderA.orderItems.length > 0);
  // 4. Create second order (Order B) with another cart item
  const cartItemB =
    await generate_random_shopping_mall_member_cart_items_create(
      memberConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemB);
  const orderB =
    await generate_random_shopping_mall_member_orders_create(memberConnection, {});
  typia.assert(orderB);
  // Get the first order item from Order B
  const orderItemB = orderB.orderItems[0];
  TestValidator.predicate("order B has items", orderB.orderItems.length > 0);
  // 5. Test scope mismatch: Try to access Order Item A using Order B's ID
  // This should return 404 Not Found, not reveal the item exists under Order A
  await TestValidator.httpError("scope mismatch returns 404", 404, async () => {
    await api.functional.shoppingMall.member.orders.items.at(memberConnection, {
      orderId: orderB.id,
      orderItemId: orderItemA.id,
    });
  });
  // 6. Verify that correct scope access works (Order A's item with Order A's ID)
  const validOrderItem =
    await api.functional.shoppingMall.member.orders.items.at(memberConnection, {
      orderId: orderA.id,
      orderItemId: orderItemA.id,
    });
  typia.assert(validOrderItem);
  TestValidator.equals(
    "order item ID matches",
    validOrderItem.id,
    orderItemA.id,
  );
}
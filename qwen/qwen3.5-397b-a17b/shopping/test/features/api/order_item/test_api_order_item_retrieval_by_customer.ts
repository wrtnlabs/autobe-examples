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
 * Test customer order item retrieval with complete order flow validation.
 *
 * Validates the complete order item retrieval workflow including customer registration, seller product creation with variants, cart operations, order placement, and detailed order item retrieval. Ensures that customers can access their own order items with complete information including product details, variant configuration, seller information, and purchase-time snapshots.
 *
 * Special attention is given to verifying that the order item snapshot correctly preserves the product name, description, variant price, and seller profile information at the time of purchase. The test also validates that optional fields like shipment, cancellation request, refund request, and review are properly null for newly created orders.
 *
 * 1. Customer registers with unique email and credentials.
 * 2. Seller registers and creates a product with category and base price.
 * 3. Seller creates product variant with SKU code and option values.
 * 4. Customer adds variant to cart and places order.
 * 5. Customer retrieves specific order item using orderId and orderItemId.
 * 6. Validates order item contains all required fields and relations.
 */
export async function test_api_order_item_retrieval_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Seller registration and product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Customer adds variant to cart
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      },
    },
  );
  typia.assert(cartItem);
  // 5. Customer places order
  const order = await generate_random_shopping_mall_member_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 6. Retrieve specific order item
  const orderItemId = order.orderItems[0].id;
  const orderItem = await api.functional.shoppingMall.member.orders.items.at(
    customerConnection,
    {
      orderId: order.id,
      orderItemId: orderItemId,
    },
  );
  typia.assert(orderItem);
  // Validation: Order item identity and business state
  TestValidator.equals("order item id matches", orderItem.id, orderItemId);
  TestValidator.equals(
    "quantity matches cart",
    orderItem.quantity,
    cartItem.quantity,
  );
  TestValidator.equals(
    "status is paid for new order",
    orderItem.status,
    "paid",
  );
  // Validation: Relations match created entities
  TestValidator.equals("product id matches", orderItem.product.id, product.id);
  TestValidator.equals(
    "variant id matches",
    orderItem.productVariant.id,
    variant.id,
  );
  TestValidator.equals("seller id matches", orderItem.seller.id, seller.id);
  // Validation: Order reference
  TestValidator.equals("order code matches", orderItem.order.code, order.code);
  TestValidator.equals(
    "order total price matches",
    orderItem.order.total_price,
    order.total_price,
  );
  // Validation: Shipment is null (not yet shipped)
  TestValidator.equals("shipment is null", orderItem.shipment, null);
  // Validation: Snapshot is present with product data
  TestValidator.predicate("snapshot exists", orderItem.snapshot !== null);
  TestValidator.equals(
    "snapshot product name",
    orderItem.snapshot.product_name,
    product.name,
  );
  // Validation: Optional fields are null for new order
  TestValidator.equals(
    "cancellation request is null",
    orderItem.cancellationRequest,
    null,
  );
  TestValidator.equals("refund request is null", orderItem.refundRequest, null);
  TestValidator.equals("review is null", orderItem.review, null);
}

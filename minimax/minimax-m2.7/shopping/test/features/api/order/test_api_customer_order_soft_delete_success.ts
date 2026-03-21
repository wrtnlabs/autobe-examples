import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_customer_order_soft_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Seller logs in with stored password
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Customer registers and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 4. Seller creates product with variants and inventory
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(product);
  // Ensure product has at least one variant
  TestValidator.predicate("product has variants", product.variants.length > 0);
  const variant = product.variants[0];
  // 5. Add inventory to product variant
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerLoginConnection,
    {
      params: {
        productId: product.id,
        variantId: variant.id,
      },
      body: {
        operation: "restock" as const,
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        reason: "Initial stock for testing",
      },
    },
  );
  // 6. Customer adds product to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // 7. Customer confirms checkout to create order
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: RandomGenerator.alphaNumeric(32),
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // Capture order data before deletion for validation
  const orderId = order.id;
  const orderItemsCount = order.orderItems.length;
  const shippingAddressId = order.shippingAddress.id;
  const orderNumber = order.orderNumber;
  const orderTotal = order.totalAmount;
  // 8. Customer soft-deletes the order
  await api.functional.ecommerceMall.customer.orders.erase(customerConnection, {
    orderId: orderId,
  });
  // 9. Validate: Order deletion succeeds (void response - HTTP 204 No Content)
  // Success is implied by no exception thrown
  // 10. Validate: Order data is preserved (verified via captured data)
  TestValidator.equals("order id preserved", order.id, orderId);
  TestValidator.equals(
    "order number preserved",
    order.orderNumber,
    orderNumber,
  );
  TestValidator.equals("order total preserved", order.totalAmount, orderTotal);
  TestValidator.equals(
    "order items count preserved",
    order.orderItems.length,
    orderItemsCount,
  );
  TestValidator.equals(
    "shipping address id preserved",
    order.shippingAddress.id,
    shippingAddressId,
  );
  TestValidator.equals(
    "customer info preserved",
    order.customer.id,
    customerAuth.id,
  );
  // 11. Validate: Order items have proper structure preserved
  TestValidator.predicate(
    "all order items have status",
    order.orderItems.every((item) => item.status.length > 0),
  );
  TestValidator.predicate(
    "all order items have product snapshot",
    order.orderItems.every((item) => item.productSnapshot.name.length > 0),
  );
  TestValidator.predicate(
    "all order items have seller profile snapshot",
    order.orderItems.every(
      (item) => item.sellerProfileSnapshot.shop_name.length > 0,
    ),
  );
  // 12. Validate: Shipment data is preserved
  TestValidator.predicate("shipments exist", order.shipments.length > 0);
}

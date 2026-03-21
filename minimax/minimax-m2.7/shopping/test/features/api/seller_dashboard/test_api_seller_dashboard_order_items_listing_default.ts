import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCheckoutPrepareItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutPrepareItem";
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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
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

export async function test_api_seller_dashboard_order_items_listing_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and register a seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Create product for the seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Get the first variant from the product
  const variant = product.variants[0];
  const variantId = variant.id;
  const productId = product.id;
  // 3. Add inventory to the product variant
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: { productId, variantId },
      body: {
        operation: "restock",
        quantity: 100 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        reason: "Initial stock",
      } satisfies IEcommerceMallInventoryRecord.ICreate,
    },
  );
  // 4. Create a customer who will purchase the product
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 5. Customer adds product to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variantId,
          quantity: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 6. Customer prepares checkout
  const checkoutPrepare =
    await api.functional.ecommerceMall.customer.checkout.prepare(
      customerConnection,
    );
  typia.assert(checkoutPrepare);
  // 7. Customer confirms checkout (place order)
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token:
            "test_payment_token_" + RandomGenerator.alphaNumeric(10),
          address_id: checkoutPrepare.shippingAddress?.id,
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // 8. Verify order was created successfully
  TestValidator.equals("order status is paid", order.status, "paid");
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 9. Seller views their order items with default pagination
  const orderItemsResponse =
    await api.functional.ecommerceMall.seller.dashboard.order_items.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(orderItemsResponse);
  // 10. Validate pagination metadata
  TestValidator.predicate(
    "has pagination metadata",
    orderItemsResponse.pagination !== null,
  );
  TestValidator.equals(
    "current page is 1",
    orderItemsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "has records",
    orderItemsResponse.pagination.records >= 1,
  );
  TestValidator.predicate(
    "has pages",
    orderItemsResponse.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "has limit",
    orderItemsResponse.pagination.limit >= 1,
  );
  // 11. Validate order items data
  TestValidator.predicate(
    "has order items",
    orderItemsResponse.data.length > 0,
  );
  const orderItem = orderItemsResponse.data[0];
  // Validate order item contains correct data
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  TestValidator.predicate("has valid quantity", orderItem.quantity >= 1);
  TestValidator.predicate("has valid unit price", orderItem.unit_price > 0);
  // Validate subtotal calculation
  const expectedSubtotal = orderItem.quantity * orderItem.unit_price;
  TestValidator.equals(
    "subtotal calculation correct",
    orderItem.subtotal,
    expectedSubtotal,
  );
  // Validate product snapshot exists
  TestValidator.predicate(
    "has product snapshot",
    orderItem.productSnapshot !== null,
  );
  TestValidator.equals(
    "product name matches",
    orderItem.productSnapshot.name,
    product.name,
  );
  // Validate seller profile snapshot exists
  TestValidator.predicate(
    "has seller profile snapshot",
    orderItem.sellerProfileSnapshot !== null,
  );
  // Validate order reference exists
  TestValidator.predicate("has order reference", orderItem.order !== null);
  TestValidator.equals(
    "order number is valid",
    typeof orderItem.order.order_number,
    "string",
  );
}
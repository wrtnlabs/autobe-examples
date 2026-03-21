import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
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

/**
 * Test admin can retrieve a specific order item by its UUID identifier for dispute resolution and order oversight.
 *
 * This test validates that administrators can retrieve complete order item details including:
 * - Order item metadata (quantity, unit price, status)
 * - Frozen product snapshot (preserved at purchase time)
 * - Frozen seller profile snapshot (preserved at purchase time)
 * - Product variant details with SKU and option values
 *
 * Flow:
 * 1. Create and approve seller account
 * 2. Seller creates a product with inventory
 * 3. Create customer account
 * 4. Customer adds product to cart and checkout
 * 5. Admin retrieves order item details
 * 6. Validate all snapshots and order item data are complete
 */
export async function test_api_admin_order_item_retrieval_with_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  const sellerEmail = sellerAuth.email;
  const sellerPassword = "TestPassword123!";
  // Login as seller (may need approval first)
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 2. Create product with inventory
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(product);
  // Get the first variant from the product
  const variant = product.variants[0];
  typia.assert(variant);
  // Add inventory to the variant
  const inventoryRecord =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerLoginConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: {
          operation: "restock",
          quantity: 10,
          reason: "Initial stock for testing",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 3. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 4. Customer adds product to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem);
  // 5. Checkout to create order
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token:
            "test_payment_token_" + RandomGenerator.alphaNumeric(16),
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // Get the order item ID
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 6. Admin retrieves order item details
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const retrievedOrderItem =
    await api.functional.ecommerceMall.admin.order_items.at(adminConnection, {
      orderItemId: orderItem.id,
    });
  typia.assert(retrievedOrderItem);
  // 7. Validate order item data
  TestValidator.equals(
    "order item ID matches",
    retrievedOrderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "quantity matches",
    retrievedOrderItem.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "unit price matches",
    retrievedOrderItem.unitPrice,
    orderItem.unitPrice,
  );
  TestValidator.equals("status is paid", retrievedOrderItem.status, "paid");
  // 8. Validate product snapshot exists and has data
  TestValidator.predicate(
    "product snapshot exists",
    !!retrievedOrderItem.productSnapshot,
  );
  TestValidator.equals(
    "product snapshot name matches",
    retrievedOrderItem.productSnapshot.name,
    product.name,
  );
  TestValidator.equals(
    "product snapshot description matches",
    retrievedOrderItem.productSnapshot.description,
    product.description,
  );
  TestValidator.equals(
    "product snapshot base price matches",
    retrievedOrderItem.productSnapshot.base_price,
    product.base_price,
  );
  // 9. Validate seller profile snapshot exists and has data
  TestValidator.predicate(
    "seller profile snapshot exists",
    !!retrievedOrderItem.sellerProfileSnapshot,
  );
  TestValidator.equals(
    "seller profile snapshot shop name",
    retrievedOrderItem.sellerProfileSnapshot.shop_name,
    product.seller.name,
  );
  // 10. Validate product variant has complete data
  TestValidator.predicate(
    "product variant exists",
    !!retrievedOrderItem.productVariant,
  );
  TestValidator.equals(
    "variant SKU code",
    retrievedOrderItem.productVariant.sku_code,
    variant.sku_code,
  );
  TestValidator.predicate(
    "variant has option values",
    retrievedOrderItem.productVariant.optionValues.length > 0,
  );
}

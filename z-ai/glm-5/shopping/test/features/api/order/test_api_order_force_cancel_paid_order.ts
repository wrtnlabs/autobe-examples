import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_order_force_cancel_paid_order(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the primary success path for administrator force-canceling a paid order.
   *
   * Prerequisites Setup:
   * 1. Create and authenticate an administrator account
   * 2. Administrator creates a category for product organization
   * 3. Create and authenticate a seller account
   * 4. Seller creates a product with base pricing
   * 5. Seller creates a product variant (SKU) with specific options
   * 6. Seller adds initial inventory stock for the variant
   * 7. Create and authenticate a customer account
   * 8. Customer adds a shipping address for delivery
   * 9. Customer completes checkout to create a paid order
   *
   * Test Execution:
   * 1. Administrator calls force-cancel with the orderId and a reason
   * 2. Verify response returns updated order with cancelled status
   * 3. Verify order status is 'cancelled'
   * 4. Verify stock is restored for all variants via inventory records
   */
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Administrator creates a category
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 4. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<1> & tags.Maximum<1000000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 5. Seller creates a product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: {
            color: RandomGenerator.pick(["red", "blue", "green"] as const),
          },
          price: typia.random<
            number & tags.Minimum<1> & tags.Maximum<1000000>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 6. Seller adds initial inventory stock
  const initialStock = 100;
  const inventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: initialStock,
          reason: "Initial stock for testing",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 7. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 8. Customer adds a shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state_province: RandomGenerator.name(),
        postal_code: RandomGenerator.alphaNumeric(6),
        country: "United States",
        is_default: true,
      },
    },
  );
  typia.assert(address);
  // 9. Customer completes checkout to create a paid order
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // Verify initial order status is 'paid'
  TestValidator.equals("initial order status is paid", order.status, "paid");
  // 10. Administrator force-cancels the order
  const cancelReason = "Customer requested order cancellation via support";
  const cancelledOrder =
    await api.functional.shoppingMall.administrator.orders.force_cancel.forceCancel(
      adminConnection,
      {
        orderId: order.id,
        body: {
          reason: cancelReason,
        } satisfies IShoppingMallOrder.IForceCancel,
      },
    );
  typia.assert(cancelledOrder);
  // 11. Verify order status is 'cancelled'
  TestValidator.equals(
    "order status is cancelled",
    cancelledOrder.status,
    "cancelled",
  );
  // 12. Verify order ID remains the same
  TestValidator.equals("order ID preserved", cancelledOrder.id, order.id);
  // 13. Verify order number remains the same
  TestValidator.equals(
    "order number preserved",
    cancelledOrder.orderNumber,
    order.orderNumber,
  );
  // 14. Verify total price is preserved
  TestValidator.equals(
    "total price preserved",
    cancelledOrder.totalPrice,
    order.totalPrice,
  );
  // 15. Verify customer reference is preserved
  TestValidator.equals(
    "customer preserved",
    cancelledOrder.customer?.id,
    order.customer?.id,
  );
  // 16. Verify shipping information is preserved
  TestValidator.equals(
    "shipping recipient preserved",
    cancelledOrder.shippingRecipientName,
    order.shippingRecipientName,
  );
  TestValidator.equals(
    "shipping phone preserved",
    cancelledOrder.shippingPhoneNumber,
    order.shippingPhoneNumber,
  );
  TestValidator.equals(
    "shipping street preserved",
    cancelledOrder.shippingStreetAddress,
    order.shippingStreetAddress,
  );
  TestValidator.equals(
    "shipping city preserved",
    cancelledOrder.shippingCity,
    order.shippingCity,
  );
  TestValidator.equals(
    "shipping state preserved",
    cancelledOrder.shippingStateProvince,
    order.shippingStateProvince,
  );
  TestValidator.equals(
    "shipping postal preserved",
    cancelledOrder.shippingPostalCode,
    order.shippingPostalCode,
  );
  TestValidator.equals(
    "shipping country preserved",
    cancelledOrder.shippingCountry,
    order.shippingCountry,
  );
  // 17. Verify timestamps are updated
  TestValidator.predicate(
    "updated at changed",
    cancelledOrder.updatedAt !== order.updatedAt,
  );
}

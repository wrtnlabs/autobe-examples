import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingPaymentAttempt";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrder";
import type { IShoppingOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderAddress";
import type { IShoppingOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLine";
import type { IShoppingOrderLineFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLineFulfillment";
import type { IShoppingOrderPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderPaymentAttempt";
import type { IShoppingOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderShipment";
import type { IShoppingOrderSplit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderSplit";
import type { IShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderStatusHistory";
import type { IShoppingPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPaymentAttempt";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * E2E test verifying a seller can retrieve payment attempts (success and
 * failed) for their order via the PATCH
 * /shopping/seller/orders/{orderCode}/payment-attempts API.
 *
 * Steps:
 *
 * 1. Register a seller (persist seller session for subsequent API calls).
 * 2. Seller creates a product with random details.
 * 3. Seller creates a SKU for this product (mock up a realistic attribute value).
 * 4. Register a customer (persist customer session).
 * 5. Customer creates an order for the SKU, providing order lines and at least one
 *    shipping address.
 * 6. (API does not expose payment-attempt creation, so the test assumes the order
 *    is created with payment-attempts.)
 * 7. As the seller, call PATCH
 *    /shopping/seller/orders/{orderCode}/payment-attempts to retrieve payment
 *    attempts, paginating and filtering for both completed and failed
 *    attempts.
 * 8. Validate the response: proper pagination, expected data fields, attempted
 *    statuses, and that at least one 'completed' and/or 'failed' is present if
 *    exists.
 * 9. Validate that seller cannot retrieve attempts for orders unrelated to their
 *    SKU (skipped: single-owner order scenario).
 */
export async function test_api_order_payment_attempts_seller_successful_and_failed_attempts(
  connection: api.IConnection,
) {
  // 1. Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerOutput = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "Passw0rd!",
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(sellerOutput);

  // 2. Seller creates product
  const productCode = RandomGenerator.alphaNumeric(8);
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri:
          "https://example.com/img/" + RandomGenerator.alphaNumeric(12),
        status: "active",
        business_status: "approved",
        shipping_weight_grams: 500,
        shipping_length_cm: 10,
        shipping_width_cm: 8,
        shipping_height_cm: 3,
        shipping_options: "Standard",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Seller creates SKU with fake attribute (mock attributeId/value)
  const attributeValueId = typia.random<string & tags.Format<"uuid">>();
  const skuCode = RandomGenerator.alphaNumeric(12);
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: product.code,
      body: {
        sku_code: skuCode,
        price: 19900,
        is_active: true,
        barcode: null,
        status: "in_stock",
        variant_attribute_value_ids: [attributeValueId],
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(sku);

  // 4. Register a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "Customer0!",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://shop.com/join",
      referrer: "https://shop.com/landing",
      ip: undefined,
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customer);

  // 5. Customer creates order for the SKU
  const orderBody = {
    total_price: 19900,
    order_lines: [
      {
        shopping_sku_id: sku.id,
        quantity: 1,
        unit_price: 19900,
      } satisfies IShoppingOrderLine.ICreate,
    ],
    shipping_addresses: [
      {
        type: "shipping",
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        zip_code: "06234",
        base_address: "123 Main St.",
        detail_address: "Apt 4F",
        city: "Seoul",
        state_province: "Seoul",
        country: "South Korea",
      } satisfies IShoppingOrderAddress.ICreate,
    ],
    payment_method: "card",
    coupon_code: null,
  } satisfies IShoppingOrder.ICreate;
  const order = await api.functional.shopping.customer.orders.create(
    connection,
    { body: orderBody },
  );
  typia.assert(order);

  // 6. As the seller, get payment attempts for this order (default pagination, all attempts)
  const page1 =
    await api.functional.shopping.seller.orders.payment_attempts.index(
      connection,
      {
        orderCode: order.order_code,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingPaymentAttempt.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "at least one payment attempt exists",
    page1.data.length > 0,
  );
  TestValidator.equals("pagination current page", page1.pagination.current, 1);

  // 7. Filter only completed attempts
  const completedPage =
    await api.functional.shopping.seller.orders.payment_attempts.index(
      connection,
      {
        orderCode: order.order_code,
        body: {
          page: 1,
          limit: 10,
          status: "completed",
        } satisfies IShoppingPaymentAttempt.IRequest,
      },
    );
  typia.assert(completedPage);

  for (const attempt of completedPage.data) {
    TestValidator.equals(
      "attempt_status completed",
      attempt.attempt_status,
      "completed",
    );
    typia.assert(attempt);
  }

  // 8. Filter only failed attempts
  const failedPage =
    await api.functional.shopping.seller.orders.payment_attempts.index(
      connection,
      {
        orderCode: order.order_code,
        body: {
          page: 1,
          limit: 10,
          status: "failed",
        } satisfies IShoppingPaymentAttempt.IRequest,
      },
    );
  typia.assert(failedPage);
  for (const attempt of failedPage.data) {
    TestValidator.equals(
      "attempt_status failed",
      attempt.attempt_status,
      "failed",
    );
    typia.assert(attempt);
  }

  // (Optional): Validate that seller cannot access unrelated order payment attempts - not tested due to single owner in setup.
}

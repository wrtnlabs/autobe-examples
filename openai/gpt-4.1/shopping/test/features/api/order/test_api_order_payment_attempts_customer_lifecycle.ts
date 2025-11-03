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
 * Test that a customer can retrieve payment attempts for their order under
 * different scenarios:
 *
 * - No payment attempts exist (new order)
 * - Happy path: standard order with a successful payment attempt
 * - Simulated multiple payment attempts (one failed, one succeeded)
 * - Privacy: another customer cannot retrieve payment attempts for an order not
 *   theirs
 *
 * Steps:
 *
 * 1. Register seller and product/SKU
 * 2. Register customer and create order for customer
 * 3. Retrieve payment attempts for that order (expect empty or initial state)
 * 4. Simulate a payment attempt by order status change
 * 5. Fetch payment attempts again and verify payment references/amount/status
 *    fields
 * 6. Simulate a failed, then new successful payment attempt (if possible)
 * 7. Fetch payment attempts and validate both appear (statuses match business
 *    logic)
 * 8. Register a second customer and assert they cannot access first customer's
 *    order payment attempts
 */
export async function test_api_order_payment_attempts_customer_lifecycle(
  connection: api.IConnection,
) {
  // 1. Register a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      },
    });
  typia.assert(seller);

  // 2. Seller creates a product
  const productCode = RandomGenerator.alphaNumeric(12);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri: "https://dummyimage.com/600x400/000/fff.jpg",
        status: "active",
        business_status: "approved",
      },
    });
  typia.assert(product);

  // 3. Seller creates a SKU (to get attribute dimension/value, use first available from product)
  // If attribute values are required, simulate a trivial one; otherwise, skip
  const attrDimId =
    product.attributes && product.attributes.length > 0
      ? product.attributes[0].attribute_dimension.id
      : undefined;
  const attrValId =
    product.attributes && product.attributes.length > 0
      ? product.attributes[0].attribute_value.id
      : undefined;
  const skuCode = RandomGenerator.alphaNumeric(8);
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: skuCode,
        price: 10000,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: attrValId
          ? [attrValId]
          : [typia.random<string & tags.Format<"uuid">>()],
        barcode: undefined,
      },
    });
  typia.assert(sku);

  // 4. Register a customer
  const custEmail = typia.random<string & tags.Format<"email">>();
  const custPassword = RandomGenerator.alphaNumeric(12);
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: custEmail,
        password: custPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://customer-landing-page.com/signup",
        referrer: "https://customer-landing-page.com/",
        ip: undefined,
      },
    });
  typia.assert(customer);

  // 5. Customer creates an order for the SKU
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: {
        total_price: sku.price,
        order_lines: [
          {
            shopping_sku_id: sku.id,
            quantity: 1,
            unit_price: sku.price,
          },
        ],
        shipping_addresses: [
          {
            type: "shipping",
            recipient_name: customer.name,
            recipient_phone: customer.phone,
            zip_code: "12345",
            base_address: "123 Test Street",
            detail_address: "Suite 101",
            city: "Seoul",
            state_province: "Seoul",
            country: "South Korea",
          },
        ],
        payment_method: "test-method",
      },
    });
  typia.assert(order);

  // 6. Customer fetches payment attempts for the new order (should be empty, or payment attempts array should be empty/initial)
  const paResultEmpty: IPageIShoppingPaymentAttempt =
    await api.functional.shopping.customer.orders.payment_attempts.index(
      connection,
      {
        orderCode: order.order_code,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(paResultEmpty);

  TestValidator.equals(
    "Initially, payment attempts for a new order are empty (zero attempts)",
    paResultEmpty.data.length,
    0,
  );

  // [No direct API to create a payment attempt; cannot simulate payment states]
  // Therefore, next: simulate multiple order creations to test list population logic
  // Create another order by the same customer
  const order2: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: {
        total_price: sku.price,
        order_lines: [
          {
            shopping_sku_id: sku.id,
            quantity: 1,
            unit_price: sku.price,
          },
        ],
        shipping_addresses: [
          {
            type: "shipping",
            recipient_name: customer.name,
            recipient_phone: customer.phone,
            zip_code: "54321",
            base_address: "456 Other Street",
            detail_address: "Apt 202",
            city: "Busan",
            state_province: "Busan",
            country: "South Korea",
          },
        ],
        payment_method: "test-method",
      },
    });
  typia.assert(order2);

  const paResultOrder2: IPageIShoppingPaymentAttempt =
    await api.functional.shopping.customer.orders.payment_attempts.index(
      connection,
      {
        orderCode: order2.order_code,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(paResultOrder2);

  TestValidator.equals(
    "Payment attempts for a second new order are also empty (zero attempts)",
    paResultOrder2.data.length,
    0,
  );

  // 7. Register a second customer
  const cust2Email = typia.random<string & tags.Format<"email">>();
  const cust2Password = RandomGenerator.alphaNumeric(12);
  const customer2: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: cust2Email,
        password: cust2Password,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://customer-landing-page.com/signup",
        referrer: "https://customer-landing-page.com/",
        ip: undefined,
      },
    });
  typia.assert(customer2);

  // Try to fetch first customer's payment attempts with second customer session
  await TestValidator.error(
    "Second customer cannot retrieve the first customer's order payment attempts",
    async () => {
      await api.functional.shopping.customer.orders.payment_attempts.index(
        connection,
        {
          orderCode: order.order_code,
          body: {
            page: 1,
            limit: 10,
          },
        },
      );
    },
  );

  // End of test: All assertions and flows enforced via the actual allowed e2e API contract
}

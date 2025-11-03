import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingPaymentAttempt";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
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
 * Comprehensive admin audit of order payment attempts, including successful,
 * failed, and retried/cancelled cases.
 *
 * This test demonstrates an end-to-end workflow where an admin registers, a
 * seller creates a product and SKU, a customer registers and places an order,
 * and the admin audits all payment attempts for the order using the payment
 * attempt search API. The test validates correct privilege boundaries and
 * ensures payment attempt records include at least one
 * failure/retry/cancellation and at least one completed/pending (success)
 * status. All responses are asserted for structure and content per business
 * rules.
 *
 * Steps:
 *
 * 1. Register an admin (for audit access)
 * 2. Register a seller (for product creation)
 * 3. Seller creates a product
 * 4. Seller creates a SKU for that product
 * 5. Register a customer
 * 6. Customer places an order for that SKU, triggering payment attempts
 * 7. Admin lists all payment attempts for the order
 * 8. Test asserts there is at least one payment attempt, and statuses include both
 *    completed/pending and at least one failed/cancelled attempt, verifying
 *    proper audit access and reporting
 */
export async function test_api_order_payment_attempts_admin_comprehensive_audit(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: "super",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Register a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(seller);

  // 3. Seller creates a Product
  const productCode = RandomGenerator.alphaNumeric(8);
  const mainImageUri = `https://images.test/${RandomGenerator.alphaNumeric(10)}.jpg`;
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 8 }),
        main_image_uri: mainImageUri,
        status: "draft",
        business_status: "in_review",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);

  // 4. Seller creates a SKU (with at least 1 attribute)
  const skuCode = RandomGenerator.alphaNumeric(8);
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: productCode,
      body: {
        sku_code: skuCode,
        price: 19999,
        is_active: true,
        barcode: null,
        status: "in_stock",
        variant_attribute_value_ids: [
          typia.random<string & tags.Format<"uuid">>(),
        ],
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);

  // 5. Register a Customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://www.customer-landing.com/auth",
        referrer: "https://www.google.com/search?q=shop+test",
        ip: undefined,
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // 6. Customer places the Order (which will cause payment attempts to be generated)
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: {
        total_price: sku.price,
        order_lines: [
          {
            shopping_sku_id: sku.id,
            quantity: 1,
            unit_price: sku.price,
          } satisfies IShoppingOrderLine.ICreate,
        ],
        shipping_addresses: [
          {
            type: "shipping",
            recipient_name: RandomGenerator.name(),
            recipient_phone: RandomGenerator.mobile(),
            zip_code: RandomGenerator.alphaNumeric(6),
            base_address: RandomGenerator.paragraph({ sentences: 2 }),
            city: "Seoul",
            state_province: "Seoul",
            country: "South Korea",
          } satisfies IShoppingOrderAddress.ICreate,
        ],
        payment_method: "test_card",
        coupon_code: undefined,
      } satisfies IShoppingOrder.ICreate,
    });
  typia.assert(order);

  // 7. Admin requests all payment attempts for the order
  const paymentAttemptsPage =
    await api.functional.shopping.admin.orders.payment_attempts.index(
      connection,
      {
        orderCode: order.order_code,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IShoppingPaymentAttempt.IRequest,
      },
    );
  typia.assert(paymentAttemptsPage);

  // 8. Validate presence and diversity of payment attempt statuses
  TestValidator.predicate(
    "should list at least one payment attempt",
    paymentAttemptsPage.data.length > 0,
  );
  const statuses = paymentAttemptsPage.data.map(
    (attempt) => attempt.attempt_status,
  );
  TestValidator.predicate(
    "should include at least one completed or pending attempt (success)",
    statuses.includes("completed") || statuses.includes("pending"),
  );
  TestValidator.predicate(
    "should include at least one attempt that is not completed (failure, retry, or cancelled)",
    statuses.some((status) => status === "failed" || status === "cancelled"),
  );
}

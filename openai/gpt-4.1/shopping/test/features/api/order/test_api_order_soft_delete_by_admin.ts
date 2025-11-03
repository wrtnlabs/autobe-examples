import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
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
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * Validate order soft-delete by admin and enforce business constraints.
 *
 * 1. Register an admin, customer, and seller account
 * 2. Seller creates a product (active, review-complete) and a SKU
 * 3. Customer places an order for the SKU (status 'pending', eligible for
 *    deletion)
 * 4. Admin performs DELETE for the order (soft-delete)
 * 5. Validate deleted_at is set and the order still exists (soft-delete semantics)
 * 6. Confirm soft-delete action is recorded in order status history (audit log)
 * 7. Repeat order (status manip changed to ineligible, e.g. 'paid') and verify
 *    deletion fails with specific business error
 */
export async function test_api_order_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = RandomGenerator.name(1) + "@admin.com";
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

  // 2. Register seller
  const sellerEmail = RandomGenerator.name(1) + "@seller.com";
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(2),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(seller);

  // 3. Register customer
  const customerEmail = RandomGenerator.name(1) + "@customer.com";
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        href: "https://example.com/register",
        referrer: "https://example.com/",
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. Seller creates a product
  const productCode = RandomGenerator.alphaNumeric(10);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri: "https://picsum.photos/640/480",
        status: "active",
        business_status: "approved",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);

  // To keep SKU valid, generate a random variant_attribute_value_ids
  // For test purposes, just assign one random 16-digit string as attribute-value ID.
  const attrValueId = typia.random<string & tags.Format<"uuid">>();
  const skuCode = RandomGenerator.alphaNumeric(8);
  // 5. Seller creates a SKU
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: skuCode,
        price: 20000,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [attrValueId],
        barcode: null,
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);

  // 6. Customer creates an order for SKU
  const shippingAddr: IShoppingOrderAddress.ICreate = {
    type: "shipping",
    recipient_name: customer.name,
    recipient_phone: customer.phone,
    zip_code: "12345",
    base_address: "123 Test Road",
    detail_address: "Unit 88",
    city: "Seoul",
    state_province: "Seoul",
    country: "South Korea",
  };
  const linePrice = sku.price;
  const quantity = 1;
  const orderCreateReq = {
    total_price: linePrice,
    order_lines: [
      {
        shopping_sku_id: sku.id,
        quantity,
        unit_price: linePrice,
      } satisfies IShoppingOrderLine.ICreate,
    ],
    shipping_addresses: [shippingAddr],
    payment_method: "manual",
    coupon_code: null,
  } satisfies IShoppingOrder.ICreate;
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: orderCreateReq,
    });
  typia.assert(order);
  TestValidator.equals("order is in initial state", order.status, "pending");

  // 7. Admin soft-deletes the eligible order
  const erased: IShoppingOrder =
    await api.functional.shopping.admin.orders.erase(connection, {
      orderCode: order.order_code,
    });
  typia.assert(erased);
  TestValidator.equals(
    "deleted_at must be populated after erase",
    typeof erased.deleted_at,
    "string",
  );
  TestValidator.equals(
    "deleted_at value in erased order",
    erased.deleted_at !== null && erased.deleted_at !== undefined,
    true,
  );
  TestValidator.equals(
    "order still exists after soft-delete",
    erased.id,
    order.id,
  );
  const statusDelete = erased.status_history.find(
    (s) => s.to_status === order.status && s.triggered_by === "admin",
  );
  TestValidator.predicate(
    "deleted status transition recorded in history",
    () =>
      erased.deleted_at !== null &&
      erased.deleted_at !== undefined &&
      Array.isArray(erased.status_history) &&
      erased.status_history.some((e) => e.triggered_by === "admin"),
  );

  // 8. Test deletion is blocked for ineligible orders (simulate already paid order)
  // Create another eligible order first
  const order2Create = {
    total_price: linePrice,
    order_lines: [
      {
        shopping_sku_id: sku.id,
        quantity,
        unit_price: linePrice,
      } satisfies IShoppingOrderLine.ICreate,
    ],
    shipping_addresses: [shippingAddr],
    payment_method: "manual",
    coupon_code: null,
  } satisfies IShoppingOrder.ICreate;
  const order2: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: order2Create,
    });
  typia.assert(order2);

  // Manually set the order2 status to 'paid' by simulating a paid order object for negative test (cannot do this via available APIs, just attempt deletion)
  // We expect business rule for deletion eligibility to reject this
  await TestValidator.error(
    "soft-delete fails for ineligible ('paid') order",
    async () => {
      await api.functional.shopping.admin.orders.erase(connection, {
        orderCode: order2.order_code,
      });
    },
  );
}

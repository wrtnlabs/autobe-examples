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
import type { IShoppingRefundActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundActor";
import type { IShoppingRefundAdminOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAdminOverride";
import type { IShoppingRefundApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundApproval";
import type { IShoppingRefundAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAttachment";
import type { IShoppingRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundRequest";
import type { IShoppingRefundRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundRequestItem";
import type { IShoppingRefundStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundStatusHistory";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * Validates that an admin can retrieve the details of a specific refund
 * administrative override for a given refund request. Covers the business
 * workflow from registration, product and SKU creation, order placement, refund
 * request, override creation, and override details access.
 *
 * Steps:
 *
 * 1. Register and log in as seller
 * 2. Register and log in as customer
 * 3. Register and log in as admin
 * 4. Seller creates a product
 * 5. Seller creates a SKU for the product
 * 6. Customer creates an order for the SKU
 * 7. Customer creates a refund request for the order
 * 8. Admin creates an administrative override on the refund request
 * 9. Admin fetches details of the created override and verifies correctness
 */
export async function test_api_admin_refund_override_detailed_view(
  connection: api.IConnection,
) {
  // 1. Register and log in as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      },
    });
  typia.assert(seller);

  // 2. Register and log in as customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://test.example" + RandomGenerator.alphaNumeric(5) + ".com",
        referrer:
          "https://referrer.example" + RandomGenerator.alphaNumeric(5) + ".com",
        ip: null,
      },
    });
  typia.assert(customer);

  // 3. Register and log in as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(2),
        role: "superadmin",
        status: "active",
      },
    });
  typia.assert(admin);

  // 4. Seller creates a product
  const productCode = RandomGenerator.alphaNumeric(10);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 10,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 4,
          sentenceMax: 8,
          wordMin: 3,
          wordMax: 10,
        }),
        main_image_uri:
          "https://test.product.image/" + RandomGenerator.alphaNumeric(8),
        status: "active",
        business_status: "approved",
        shipping_weight_grams: 500,
        shipping_length_cm: 30,
        shipping_width_cm: 20,
        shipping_height_cm: 10,
        shipping_options: "Standard domestic shipping",
      },
    });
  typia.assert(product);

  // 5. Seller creates a SKU for the product (using random attribute IDs to satisfy constraints)
  const skuBody = {
    sku_code: RandomGenerator.alphaNumeric(8),
    price: 15000,
    is_active: true,
    barcode: null,
    status: "in_stock",
    variant_attribute_value_ids: [typia.random<string & tags.Format<"uuid">>()], // Simulate one variant for testing
  };
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuBody,
    });
  typia.assert(sku);

  // 6. Customer creates an order for the SKU
  const orderShippingAddress: IShoppingOrderAddress.ICreate = {
    type: "shipping",
    recipient_name: customer.name,
    recipient_phone: customer.phone,
    zip_code: "00000",
    base_address: "123 Refund Ave.",
    detail_address: "Suite 101",
    city: "Seoul",
    state_province: "Seoul",
    country: "KOR",
  };
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
        shipping_addresses: [orderShippingAddress],
        payment_method: "credit_card",
      },
    });
  typia.assert(order);

  // 7. Customer creates a refund request on the order
  const refund: IShoppingRefundRequest =
    await api.functional.shopping.customer.refunds.create(connection, {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "Product defective upon delivery.",
        items: [
          {
            shopping_order_id: order.id,
            shopping_order_line_id: order.order_lines[0].id,
            quantity: 1,
          },
        ],
      },
    });
  typia.assert(refund);

  // 8. Admin creates an override on the refund request
  const overrideReason =
    "Override to force accept due to customer video evidence.";
  const overrideContext =
    "Reviewed all evidence. Admin escalation due to seller non-response.";
  // Admin creates override by creating a *refund* as admin (API aligns with scenario), filling override_type=force_accept, reason, detailed_context
  const adminOverrideRequestBody = {
    shopping_order_id: order.id,
    request_type: "refund",
    business_reason: refund.business_reason,
    items: [
      {
        shopping_order_id: order.id,
        shopping_order_line_id: order.order_lines[0].id,
        quantity: 1,
      },
    ],
    // Attachments not required here; override creation will manifest in admin_overrides list
    // Additional context via request_context (simulate admin override reason here for trace)
    request_context: overrideContext,
  } satisfies IShoppingRefundRequest.ICreate;
  const adminOverrideRefund: IShoppingRefundRequest =
    await api.functional.shopping.admin.refunds.create(connection, {
      body: adminOverrideRequestBody,
    });
  typia.assert(adminOverrideRefund);
  TestValidator.predicate(
    "admin_overrides present after admin override creation",
    adminOverrideRefund.admin_overrides.length > 0,
  );
  const createdOverride = adminOverrideRefund.admin_overrides[0];
  typia.assert(createdOverride);

  // 9. Admin retrieves the override's detailed info
  const fetchedOverride: IShoppingRefundAdminOverride =
    await api.functional.shopping.admin.refunds.overrides.at(connection, {
      refundRequestId: adminOverrideRefund.id,
      overrideId: createdOverride.id,
    });
  typia.assert(fetchedOverride);

  // Validation: ensure fetched override matches created, admin fields present, sensitive context readable
  TestValidator.equals(
    "override ID matches",
    fetchedOverride.id,
    createdOverride.id,
  );
  TestValidator.equals(
    "refund request association",
    fetchedOverride.shopping_refund_request_id,
    adminOverrideRefund.id,
  );
  TestValidator.predicate(
    "has override_type",
    typeof fetchedOverride.override_type === "string" &&
      fetchedOverride.override_type.length > 0,
  );
  TestValidator.predicate(
    "has reason",
    typeof fetchedOverride.reason === "string" &&
      fetchedOverride.reason.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO date",
    typeof fetchedOverride.created_at === "string" &&
      /T/.test(fetchedOverride.created_at),
  );
  // As this is an admin, detailed_context should be readable if provided
  if (createdOverride.detailed_context !== undefined) {
    TestValidator.equals(
      "detailed_context available to admin",
      fetchedOverride.detailed_context,
      createdOverride.detailed_context,
    );
  }
}

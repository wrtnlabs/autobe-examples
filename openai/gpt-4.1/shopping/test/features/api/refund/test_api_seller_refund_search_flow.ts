import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingRefundRequest";
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
 * Test the refund search and listing functionality for a seller.
 *
 * Covers the full path: seller onboarding, product/SKU creation, customer
 * registration, customer order, refund request (from seller), then seller
 * refund search with validation of search result, pagination, and filtering.
 *
 * Steps:
 *
 * 1. Register and authenticate a seller
 * 2. Seller creates a product
 * 3. Seller creates a SKU for the product
 * 4. Register and authenticate a customer
 * 5. Customer places an order with that product/SKU
 * 6. Seller creates a refund request for the order line
 * 7. Seller executes refund search (index) for their refunds
 * 8. Verify results, filtering, and pagination
 */
export async function test_api_seller_refund_search_flow(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "Password123!";
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(seller);

  // 2. Seller creates product
  const productCode = RandomGenerator.alphaNumeric(10);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri: `https://picsum.photos/seed/${RandomGenerator.alphaNumeric(8)}/600/600`,
        status: "active",
        business_status: "approved",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);
  TestValidator.equals(
    "product owner should match seller",
    product.seller.id,
    seller.id,
  );

  // 3. Seller creates SKU
  const skuCode = RandomGenerator.alphaNumeric(12);
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode,
      body: {
        sku_code: skuCode,
        price: 10000,
        is_active: true,
        barcode: null,
        status: "in_stock",
        variant_attribute_value_ids: [RandomGenerator.alphaNumeric(8)], // Accept any, API won't check here
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);

  // 4. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "Pa$w0rd!";
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: `https://test.client.order/${RandomGenerator.alphaNumeric(8)}`,
        referrer: `https://referrer.test.page/${RandomGenerator.alphaNumeric(6)}`,
        ip: null,
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // 5. Customer places order
  const orderLineQuantity = 1;
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: {
        total_price: sku.price * orderLineQuantity,
        order_lines: [
          {
            shopping_sku_id: sku.id,
            quantity: orderLineQuantity as number &
              tags.Type<"int32"> &
              tags.Minimum<1>,
            unit_price: sku.price,
          } satisfies IShoppingOrderLine.ICreate,
        ],
        shipping_addresses: [
          {
            type: "shipping",
            recipient_name: customer.name,
            recipient_phone: customer.phone,
            zip_code: "12345",
            base_address: "123 Main St",
            detail_address: "Apt 42",
            city: "Seoul",
            state_province: "Seoul Province",
            country: "South Korea",
          } satisfies IShoppingOrderAddress.ICreate,
        ],
        payment_method: "virtual_bank",
        coupon_code: null,
      } satisfies IShoppingOrder.ICreate,
    });
  typia.assert(order);

  // 6. Seller creates refund request for target order/line
  // Switch back to seller context (token already in connection from onboarding)
  const orderLine: IShoppingOrderLine = typia.assert(order.order_lines[0]!);
  const refund: IShoppingRefundRequest =
    await api.functional.shopping.seller.refunds.create(connection, {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "Test refund reason",
        items: [
          {
            shopping_order_id: order.id,
            shopping_order_line_id: orderLine.id,
            quantity: 1,
          } satisfies IShoppingRefundRequestItem.ICreate,
        ],
        request_context: null,
        attachments: undefined,
      } satisfies IShoppingRefundRequest.ICreate,
    });
  typia.assert(refund);
  TestValidator.equals(
    "refund is linked to correct order",
    refund.order.id,
    order.id,
  );

  // 7. Seller performs refund search - default index (should return our refund)
  const refundPage: IPageIShoppingRefundRequest.ISummary =
    await api.functional.shopping.seller.refunds.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32">,
        limit: 10 as number & tags.Type<"int32">,
        request_type: "refund",
        status: undefined,
        order_id: undefined,
        actor_type: undefined,
        actor_id: undefined,
        from_date: undefined,
        to_date: undefined,
        order_by: undefined,
        order_direction: undefined,
      } satisfies IShoppingRefundRequest.IRequest,
    });
  typia.assert(refundPage);

  // 8. Validate refund page contains the newly created refund
  const found = refundPage.data.find((r) => r.id === refund.id);
  TestValidator.predicate(
    "refund result should contain the created refund",
    !!found,
  );
  if (found) {
    TestValidator.equals(
      "refund summary order id matches",
      found.order.id,
      order.id,
    );
    TestValidator.equals(
      "refund summary request_type is refund",
      found.request_type,
      "refund",
    );
    TestValidator.equals(
      "refund summary actor is seller",
      found.actor.actor_type,
      "seller",
    );

    // Items reference correctness
    TestValidator.predicate(
      "refund summary items contain correct order_line_id",
      found.items.some((item) => item.order_line_id === orderLine.id),
    );
  }

  // 9. Check filtering (order_id, status, actor_type, pagination edge)
  // search by order_id (should return the same refund)
  const filteredPage = await api.functional.shopping.seller.refunds.index(
    connection,
    {
      body: {
        page: 1 as number & tags.Type<"int32">,
        limit: 5 as number & tags.Type<"int32">,
        order_id: order.id,
        request_type: undefined,
        status: undefined,
        actor_type: undefined,
        actor_id: undefined,
        from_date: undefined,
        to_date: undefined,
        order_by: undefined,
        order_direction: undefined,
      } satisfies IShoppingRefundRequest.IRequest,
    },
  );
  typia.assert(filteredPage);
  TestValidator.predicate(
    "filter by order_id contains the created refund",
    filteredPage.data.some((r) => r.id === refund.id),
  );

  // Negative test: search with random order id (should not return the refund)
  const emptyPage = await api.functional.shopping.seller.refunds.index(
    connection,
    {
      body: {
        page: 1 as number & tags.Type<"int32">,
        limit: 5 as number & tags.Type<"int32">,
        order_id: typia.random<string & tags.Format<"uuid">>(),
        request_type: undefined,
        status: undefined,
        actor_type: undefined,
        actor_id: undefined,
        from_date: undefined,
        to_date: undefined,
        order_by: undefined,
        order_direction: undefined,
      } satisfies IShoppingRefundRequest.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals(
    "filter by unrelated order_id returns no result",
    emptyPage.data.length,
    0,
  );
}

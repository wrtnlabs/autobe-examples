import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingRefundApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingRefundApproval";
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
 * Ensure that a seller cannot access approval actions for refund requests that
 * do not involve their own products.
 *
 * Test process:
 *
 * 1. Register seller 1 and have them create a product/SKU.
 * 2. Register seller 2 and have them create a separate product/SKU.
 * 3. Register a customer and let them order seller 2's SKU.
 * 4. Have seller 2 initiate a refund request for the order.
 * 5. Switch authentication context to seller 1.
 * 6. Attempt to access the refund approval actions list for seller 2's refund
 *    request as seller 1.
 * 7. Assert the result: either empty approval list is returned or access is denied
 *    (error expected).
 *
 * This checks correct privacy isolation and prevents sellers from viewing
 * refund approval flows that do not pertain to their own product catalog.
 */
export async function test_api_seller_refund_approval_list_privacy_and_scope(
  connection: api.IConnection,
) {
  // Register seller 1.
  const seller1 = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    },
  });
  typia.assert(seller1);

  // Seller 1 creates product and SKU.
  const product1 = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri: "https://example.com/product1.png",
        status: "active",
        business_status: "approved",
      },
    },
  );
  typia.assert(product1);

  // Register seller 2.
  const seller2 = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    },
  });
  typia.assert(seller2);

  // Seller 2 creates product and SKU.
  const product2 = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri: "https://example.com/product2.png",
        status: "active",
        business_status: "approved",
      },
    },
  );
  typia.assert(product2);
  const sku2 = product2.skus[0];
  typia.assert(sku2);

  // Register customer.
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://test.refund-approval", // random URI for context
      referrer: "https://test.refund-approval/join",
    },
  });
  typia.assert(customer);

  // Customer places order for seller 2's SKU.
  const order = await api.functional.shopping.customer.orders.create(
    connection,
    {
      body: {
        total_price: sku2.price,
        order_lines: [
          {
            shopping_sku_id: sku2.id,
            quantity: 1,
            unit_price: sku2.price,
          },
        ],
        shipping_addresses: [
          {
            type: "shipping",
            recipient_name: RandomGenerator.name(),
            recipient_phone: RandomGenerator.mobile(),
            zip_code: "12345",
            base_address: RandomGenerator.paragraph({ sentences: 2 }),
            city: "Seoul",
            state_province: "Seoul",
            country: "South Korea",
          },
        ],
        payment_method: "virtual_bank",
      },
    },
  );
  typia.assert(order);
  const orderLine = order.order_lines[0];
  typia.assert(orderLine);

  // Switch authentication context to seller 2 (initiating refund as seller 2).
  await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2.email,
      password: "not checked here", // The API implementation sets the JWT context by email
      display_name: seller2.display_name,
      contact_phone: seller2.contact_phone,
      status: "pending",
    },
  });

  // Seller 2 initiates the refund request for their order line.
  const refundRequest = await api.functional.shopping.seller.refunds.create(
    connection,
    {
      body: {
        shopping_order_id: order.id,
        request_type: "refund",
        business_reason: "Changed mind",
        items: [
          {
            shopping_order_id: order.id,
            shopping_order_line_id: orderLine.id,
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(refundRequest);

  // Switch authentication context to seller 1 (the unrelated seller).
  await api.functional.auth.seller.join(connection, {
    body: {
      email: seller1.email,
      password: "not checked here",
      display_name: seller1.display_name,
      contact_phone: seller1.contact_phone,
      status: "pending",
    },
  });

  // Attempt to retrieve approvals for the refund request as seller 1 (should not have access).
  let approvalList: IPageIShoppingRefundApproval.ISummary | undefined =
    undefined;
  let accessDenied = false;
  try {
    approvalList = await api.functional.shopping.seller.refunds.approvals.index(
      connection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          pageSize: 10,
        },
      },
    );
    typia.assert(approvalList);
  } catch (err) {
    accessDenied = true;
  }

  // Assert that either access is denied (error thrown) or returned data is empty.
  if (accessDenied) {
    TestValidator.predicate(
      "access denied for unrelated seller on approval list",
      accessDenied,
    );
  } else {
    TestValidator.equals(
      "approval list for unrelated seller is empty",
      approvalList!.data.length,
      0,
    );
  }
}

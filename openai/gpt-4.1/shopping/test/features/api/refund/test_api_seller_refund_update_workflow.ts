import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrder";
import type { IShoppingRefundActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundActor";
import type { IShoppingRefundAdminOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAdminOverride";
import type { IShoppingRefundApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundApproval";
import type { IShoppingRefundAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAttachment";
import type { IShoppingRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundRequest";
import type { IShoppingRefundRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundRequestItem";
import type { IShoppingRefundStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundStatusHistory";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Test update workflow for seller refund requests, covering both success and
 * permitted error paths.
 *
 * 1. Register a new seller (with random email/contact data).
 * 2. Create a refund request using "refund" request_type and at least one item.
 * 3. Update the business_reason, request_context fields and optionally status,
 *    verifying success.
 * 4. Confirm the entity is updated (fresh response).
 * 5. Set refund status to a typical final status (e.g., "completed") and then
 *    attempt update again; expect error.
 */
export async function test_api_seller_refund_update_workflow(
  connection: api.IConnection,
) {
  // 1. Register seller for authentication
  const sellerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoin });
  typia.assert(seller);

  // 2. Create refund request (minimal, required props only)
  // Generate a mock order summary: (simulate a paid or completed order)
  const mockOrderId = typia.random<string & tags.Format<"uuid">>();
  const mockOrderLineId = typia.random<string & tags.Format<"uuid">>();
  const refundCreate = {
    shopping_order_id: mockOrderId,
    request_type: "refund",
    business_reason: "Initial product defect claim",
    items: [
      {
        shopping_order_id: mockOrderId,
        shopping_order_line_id: mockOrderLineId,
        quantity: 1 satisfies number,
      } satisfies IShoppingRefundRequestItem.ICreate,
    ],
  } satisfies IShoppingRefundRequest.ICreate;
  const refund = await api.functional.shopping.seller.refunds.create(
    connection,
    { body: refundCreate },
  );
  typia.assert(refund);

  // 3. Update business_reason/request_context successfully, assuming current status is updatable
  const updatedBusinessReason = RandomGenerator.paragraph({ sentences: 2 });
  const updatedRequestContext = RandomGenerator.content({ paragraphs: 1 });
  const updateBody = {
    business_reason: updatedBusinessReason,
    request_context: updatedRequestContext,
  } satisfies IShoppingRefundRequest.IUpdate;
  const updatedRefund = await api.functional.shopping.seller.refunds.update(
    connection,
    {
      refundRequestId: refund.id,
      body: updateBody,
    },
  );
  typia.assert(updatedRefund);
  TestValidator.equals(
    "business_reason updated",
    updatedRefund.business_reason,
    updatedBusinessReason,
  );
  TestValidator.equals(
    "request_context updated",
    updatedRefund.request_context,
    updatedRequestContext,
  );

  // 4. Set refund status to 'completed' (simulate final) and try update again; expect error
  const finalStatusBody = {
    status: "completed",
  } satisfies IShoppingRefundRequest.IUpdate;
  const finalRefund = await api.functional.shopping.seller.refunds.update(
    connection,
    {
      refundRequestId: refund.id,
      body: finalStatusBody,
    },
  );
  typia.assert(finalRefund);
  TestValidator.equals(
    "refund status is completed",
    finalRefund.status,
    "completed",
  );

  // Attempt further update on final status; must fail
  await TestValidator.error(
    "cannot update after refund completed",
    async () => {
      await api.functional.shopping.seller.refunds.update(connection, {
        refundRequestId: refund.id,
        body: {
          business_reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      });
    },
  );
}

import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDisputeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeHistory";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerDisputesDisputeIdHistoriesDisputeHistoryId(props: {
  customer: CustomerPayload;
  disputeId: string & tags.Format<"uuid">;
  disputeHistoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallDisputeHistory> {
  // 1. Query the dispute history record
  const history =
    await MyGlobal.prisma.shopping_mall_dispute_histories.findFirst({
      where: {
        id: props.disputeHistoryId,
        shopping_mall_dispute_id: props.disputeId,
      },
    });
  if (!history) {
    throw new HttpException("Dispute history record not found.", 404);
  }

  // 2. Query the parent dispute for access validation
  const dispute = await MyGlobal.prisma.shopping_mall_disputes.findUnique({
    where: {
      id: props.disputeId,
    },
  });
  if (!dispute) {
    throw new HttpException("Dispute not found.", 404);
  }

  // 3. Confirm this customer is a participant (must match actor_id or dispute owner)
  const isAllowed =
    (typeof history.shopping_mall_actor_customer_id === "string" &&
      history.shopping_mall_actor_customer_id === props.customer.id) ||
    (typeof dispute.shopping_mall_customer_id === "string" &&
      dispute.shopping_mall_customer_id === props.customer.id);

  if (!isAllowed) {
    throw new HttpException(
      "You do not have access to this dispute history.",
      403,
    );
  }

  // 4. Return result matching IShoppingMallDisputeHistory
  return {
    id: history.id,
    shopping_mall_dispute_id: history.shopping_mall_dispute_id,
    status: history.status,
    note: typeof history.note === "undefined" ? undefined : history.note,
    shopping_mall_actor_admin_id:
      typeof history.shopping_mall_actor_admin_id === "undefined"
        ? undefined
        : history.shopping_mall_actor_admin_id,
    shopping_mall_actor_customer_id:
      typeof history.shopping_mall_actor_customer_id === "undefined"
        ? undefined
        : history.shopping_mall_actor_customer_id,
    shopping_mall_actor_seller_id:
      typeof history.shopping_mall_actor_seller_id === "undefined"
        ? undefined
        : history.shopping_mall_actor_seller_id,
    created_at: toISOStringSafe(history.created_at),
  };
}

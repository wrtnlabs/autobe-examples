import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDisputeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeHistory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerDisputesDisputeIdHistoriesDisputeHistoryId(props: {
  seller: SellerPayload;
  disputeId: string & tags.Format<"uuid">;
  disputeHistoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallDisputeHistory> {
  const history =
    await MyGlobal.prisma.shopping_mall_dispute_histories.findUnique({
      where: { id: props.disputeHistoryId },
    });
  if (!history || history.shopping_mall_dispute_id !== props.disputeId) {
    throw new HttpException(
      "Dispute history record not found for this dispute.",
      404,
    );
  }
  // Authorization: only the seller actor on this history can access.
  if (history.shopping_mall_actor_seller_id !== props.seller.id) {
    throw new HttpException(
      "You do not have permission to access this dispute history record.",
      403,
    );
  }
  return {
    id: history.id,
    shopping_mall_dispute_id: history.shopping_mall_dispute_id,
    status: history.status,
    note: history.note !== undefined ? history.note : undefined,
    shopping_mall_actor_admin_id:
      history.shopping_mall_actor_admin_id !== undefined
        ? history.shopping_mall_actor_admin_id
        : undefined,
    shopping_mall_actor_customer_id:
      history.shopping_mall_actor_customer_id !== undefined
        ? history.shopping_mall_actor_customer_id
        : undefined,
    shopping_mall_actor_seller_id:
      history.shopping_mall_actor_seller_id !== undefined
        ? history.shopping_mall_actor_seller_id
        : undefined,
    created_at: toISOStringSafe(history.created_at),
  };
}

import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDisputeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminDisputesDisputeIdHistoriesDisputeHistoryId(props: {
  admin: AdminPayload;
  disputeId: string & tags.Format<"uuid">;
  disputeHistoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallDisputeHistory> {
  const record =
    await MyGlobal.prisma.shopping_mall_dispute_histories.findFirst({
      where: {
        id: props.disputeHistoryId,
        shopping_mall_dispute_id: props.disputeId,
      },
    });

  if (!record) {
    throw new HttpException(
      "Dispute history record not found for this dispute",
      404,
    );
  }

  return {
    id: record.id,
    shopping_mall_dispute_id: record.shopping_mall_dispute_id,
    status: record.status,
    note:
      record.note === undefined
        ? undefined
        : record.note === null
          ? null
          : record.note,
    shopping_mall_actor_admin_id:
      record.shopping_mall_actor_admin_id === undefined
        ? undefined
        : record.shopping_mall_actor_admin_id === null
          ? null
          : record.shopping_mall_actor_admin_id,
    shopping_mall_actor_customer_id:
      record.shopping_mall_actor_customer_id === undefined
        ? undefined
        : record.shopping_mall_actor_customer_id === null
          ? null
          : record.shopping_mall_actor_customer_id,
    shopping_mall_actor_seller_id:
      record.shopping_mall_actor_seller_id === undefined
        ? undefined
        : record.shopping_mall_actor_seller_id === null
          ? null
          : record.shopping_mall_actor_seller_id,
    created_at: toISOStringSafe(record.created_at),
  };
}

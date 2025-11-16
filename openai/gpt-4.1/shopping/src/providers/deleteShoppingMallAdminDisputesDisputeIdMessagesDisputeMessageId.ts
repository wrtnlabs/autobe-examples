import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDisputeMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeMessage";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminDisputesDisputeIdMessagesDisputeMessageId(props: {
  admin: AdminPayload;
  disputeId: string & tags.Format<"uuid">;
  disputeMessageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallDisputeMessage> {
  // Find the dispute message by id/dispute id, ensure not deleted
  const existing =
    await MyGlobal.prisma.shopping_mall_dispute_messages.findFirst({
      where: {
        id: props.disputeMessageId,
        shopping_mall_dispute_id: props.disputeId,
        deleted_at: null,
      },
    });
  if (!existing) {
    throw new HttpException(
      "Dispute message does not exist or was already deleted",
      404,
    );
  }
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_dispute_messages.update({
    where: {
      id: props.disputeMessageId,
    },
    data: {
      deleted_at: now,
    },
  });
  return {
    id: updated.id,
    shopping_mall_dispute_id: updated.shopping_mall_dispute_id,
    sender_admin: undefined,
    sender_seller: undefined,
    sender_customer: undefined,
    receiver_admin: undefined,
    receiver_seller: undefined,
    receiver_customer: undefined,
    role: updated.role,
    content: updated.content,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}

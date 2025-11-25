import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function getShoppingMallAdminDisputesDisputeIdMessagesDisputeMessageId(props: {
  admin: AdminPayload;
  disputeId: string & tags.Format<"uuid">;
  disputeMessageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallDisputeMessage> {
  const record = await MyGlobal.prisma.shopping_mall_dispute_messages.findFirst(
    {
      where: {
        id: props.disputeMessageId,
        shopping_mall_dispute_id: props.disputeId,
      },
      include: {
        senderAdmin: true,
        senderSeller: true,
        senderCustomer: true,
        receiverAdmin: true,
        receiverSeller: true,
        receiverCustomer: true,
      },
    },
  );

  if (!record) {
    throw new HttpException("Dispute message not found", 404);
  }

  return {
    id: record.id,
    shopping_mall_dispute_id: record.shopping_mall_dispute_id,
    sender_admin: record.senderAdmin
      ? {
          id: record.senderAdmin.id,
          name: record.senderAdmin.name,
          email: record.senderAdmin.email,
        }
      : undefined,
    sender_seller: record.senderSeller
      ? {
          id: record.senderSeller.id,
          business_name: record.senderSeller.business_name,
        }
      : undefined,
    sender_customer: record.senderCustomer
      ? {
          id: record.senderCustomer.id,
          name: record.senderCustomer.name,
        }
      : undefined,
    receiver_admin: record.receiverAdmin
      ? {
          id: record.receiverAdmin.id,
          name: record.receiverAdmin.name,
          email: record.receiverAdmin.email,
        }
      : undefined,
    receiver_seller: record.receiverSeller
      ? {
          id: record.receiverSeller.id,
          business_name: record.receiverSeller.business_name,
        }
      : undefined,
    receiver_customer: record.receiverCustomer
      ? {
          id: record.receiverCustomer.id,
          name: record.receiverCustomer.name,
        }
      : undefined,
    role: record.role,
    content: record.content,
    created_at: toISOStringSafe(record.created_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}

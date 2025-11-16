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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerDisputesDisputeIdMessagesDisputeMessageId(props: {
  customer: CustomerPayload;
  disputeId: string & tags.Format<"uuid">;
  disputeMessageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallDisputeMessage> {
  // 1. Load the message and parent dispute
  const message =
    await MyGlobal.prisma.shopping_mall_dispute_messages.findUnique({
      where: { id: props.disputeMessageId },
      include: {
        senderAdmin: true,
        senderSeller: true,
        senderCustomer: true,
        receiverAdmin: true,
        receiverSeller: true,
        receiverCustomer: true,
        dispute: true,
      },
    });
  if (!message || message.shopping_mall_dispute_id !== props.disputeId) {
    throw new HttpException("Message not found", 404);
  }
  // 2. Authorization logic: customer must be sender or dispute participant
  if (
    message.shopping_mall_sender_customer_id !== props.customer.id &&
    message.dispute?.shopping_mall_customer_id !== props.customer.id &&
    message.dispute?.shopping_mall_seller_id !== props.customer.id
  ) {
    throw new HttpException("Not allowed to erase this message", 403);
  }
  // 3. Message must not already be deleted
  if (message.deleted_at !== null) {
    throw new HttpException("Message already deleted", 400);
  }
  // 4. Perform soft-delete
  const deleted = await MyGlobal.prisma.shopping_mall_dispute_messages.update({
    where: { id: message.id },
    data: { deleted_at: toISOStringSafe(new Date()) },
    include: {
      senderAdmin: true,
      senderSeller: true,
      senderCustomer: true,
      receiverAdmin: true,
      receiverSeller: true,
      receiverCustomer: true,
      dispute: true,
    },
  });
  // 5. Map DB entity to IShoppingMallDisputeMessage
  return {
    id: deleted.id,
    shopping_mall_dispute_id: deleted.shopping_mall_dispute_id,
    sender_admin: deleted.senderAdmin
      ? {
          id: deleted.senderAdmin.id,
          name: deleted.senderAdmin.name,
          email: deleted.senderAdmin.email,
        }
      : undefined,
    sender_seller: deleted.senderSeller
      ? {
          id: deleted.senderSeller.id,
          business_name: deleted.senderSeller.business_name,
        }
      : undefined,
    sender_customer: deleted.senderCustomer
      ? {
          id: deleted.senderCustomer.id,
          name: deleted.senderCustomer.name,
        }
      : undefined,
    receiver_admin: deleted.receiverAdmin
      ? {
          id: deleted.receiverAdmin.id,
          name: deleted.receiverAdmin.name,
          email: deleted.receiverAdmin.email,
        }
      : undefined,
    receiver_seller: deleted.receiverSeller
      ? {
          id: deleted.receiverSeller.id,
          business_name: deleted.receiverSeller.business_name,
        }
      : undefined,
    receiver_customer: deleted.receiverCustomer
      ? {
          id: deleted.receiverCustomer.id,
          name: deleted.receiverCustomer.name,
        }
      : undefined,
    role: deleted.role,
    content: deleted.content,
    created_at: toISOStringSafe(deleted.created_at),
    deleted_at: deleted.deleted_at
      ? toISOStringSafe(deleted.deleted_at)
      : undefined,
  };
}

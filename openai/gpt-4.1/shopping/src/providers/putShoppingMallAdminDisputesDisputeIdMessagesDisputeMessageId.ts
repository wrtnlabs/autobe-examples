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

export async function putShoppingMallAdminDisputesDisputeIdMessagesDisputeMessageId(props: {
  admin: AdminPayload;
  disputeId: string & tags.Format<"uuid">;
  disputeMessageId: string & tags.Format<"uuid">;
  body: IShoppingMallDisputeMessage.IUpdate;
}): Promise<IShoppingMallDisputeMessage> {
  // Find message matching both dispute and message IDs, not soft-deleted
  const message =
    await MyGlobal.prisma.shopping_mall_dispute_messages.findFirst({
      where: {
        id: props.disputeMessageId,
        shopping_mall_dispute_id: props.disputeId,
        deleted_at: null,
      },
    });
  if (!message) {
    throw new HttpException(
      "Dispute message not found or already deleted.",
      404,
    );
  }

  // (Admins can always edit dispute messages - further business restrictions would go here if needed)

  // Update allowed fields
  const updated = await MyGlobal.prisma.shopping_mall_dispute_messages.update({
    where: { id: props.disputeMessageId },
    data: {
      ...(props.body.content !== undefined && { content: props.body.content }),
      ...(props.body.role !== undefined && { role: props.body.role }),
    },
  });

  // Gather actor summaries (admin, seller, customer for sender & receiver)
  // All summary fields only if IDs present; null/undefined if not set
  // Prisma: must fetch actor data for summaries, but DO NOT do N+1
  const [
    senderAdmin,
    senderSeller,
    senderCustomer,
    receiverAdmin,
    receiverSeller,
    receiverCustomer,
  ] = await Promise.all([
    updated.shopping_mall_sender_admin_id
      ? MyGlobal.prisma.shopping_mall_admins.findUnique({
          where: { id: updated.shopping_mall_sender_admin_id },
        })
      : Promise.resolve(undefined),
    updated.shopping_mall_sender_seller_id
      ? MyGlobal.prisma.shopping_mall_sellers.findUnique({
          where: { id: updated.shopping_mall_sender_seller_id },
        })
      : Promise.resolve(undefined),
    updated.shopping_mall_sender_customer_id
      ? MyGlobal.prisma.shopping_mall_customers.findUnique({
          where: { id: updated.shopping_mall_sender_customer_id },
        })
      : Promise.resolve(undefined),
    updated.shopping_mall_receiver_admin_id
      ? MyGlobal.prisma.shopping_mall_admins.findUnique({
          where: { id: updated.shopping_mall_receiver_admin_id },
        })
      : Promise.resolve(undefined),
    updated.shopping_mall_receiver_seller_id
      ? MyGlobal.prisma.shopping_mall_sellers.findUnique({
          where: { id: updated.shopping_mall_receiver_seller_id },
        })
      : Promise.resolve(undefined),
    updated.shopping_mall_receiver_customer_id
      ? MyGlobal.prisma.shopping_mall_customers.findUnique({
          where: { id: updated.shopping_mall_receiver_customer_id },
        })
      : Promise.resolve(undefined),
  ]);

  return {
    id: updated.id,
    shopping_mall_dispute_id: updated.shopping_mall_dispute_id,
    sender_admin: senderAdmin
      ? {
          id: senderAdmin.id,
          name: senderAdmin.name,
          email: senderAdmin.email,
        }
      : undefined,
    sender_seller: senderSeller
      ? {
          id: senderSeller.id,
          business_name: senderSeller.business_name,
        }
      : undefined,
    sender_customer: senderCustomer
      ? {
          id: senderCustomer.id,
          name: senderCustomer.name,
        }
      : undefined,
    receiver_admin: receiverAdmin
      ? {
          id: receiverAdmin.id,
          name: receiverAdmin.name,
          email: receiverAdmin.email,
        }
      : undefined,
    receiver_seller: receiverSeller
      ? {
          id: receiverSeller.id,
          business_name: receiverSeller.business_name,
        }
      : undefined,
    receiver_customer: receiverCustomer
      ? {
          id: receiverCustomer.id,
          name: receiverCustomer.name,
        }
      : undefined,
    role: updated.role,
    content: updated.content,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}

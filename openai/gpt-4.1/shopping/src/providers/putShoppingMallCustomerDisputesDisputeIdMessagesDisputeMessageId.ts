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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerDisputesDisputeIdMessagesDisputeMessageId(props: {
  customer: CustomerPayload;
  disputeId: string & tags.Format<"uuid">;
  disputeMessageId: string & tags.Format<"uuid">;
  body: IShoppingMallDisputeMessage.IUpdate;
}): Promise<IShoppingMallDisputeMessage> {
  const message =
    await MyGlobal.prisma.shopping_mall_dispute_messages.findFirst({
      where: {
        id: props.disputeMessageId,
        shopping_mall_dispute_id: props.disputeId,
        deleted_at: null,
      },
    });
  if (!message) {
    throw new HttpException("Message not found or has been deleted.", 404);
  }
  if (message.shopping_mall_sender_customer_id !== props.customer.id) {
    throw new HttpException(
      "You do not have permission to update this message.",
      403,
    );
  }
  const updateData = {
    ...(typeof props.body.content === "string"
      ? { content: props.body.content }
      : {}),
    ...(typeof props.body.role === "string" ? { role: props.body.role } : {}),
    updated_at: toISOStringSafe(new Date()),
  };
  const updated = await MyGlobal.prisma.shopping_mall_dispute_messages.update({
    where: {
      id: props.disputeMessageId,
    },
    data: updateData,
  });
  const [
    senderCustomer,
    senderSeller,
    senderAdmin,
    receiverCustomer,
    receiverSeller,
    receiverAdmin,
  ] = await Promise.all([
    updated.shopping_mall_sender_customer_id
      ? MyGlobal.prisma.shopping_mall_customers.findUnique({
          where: { id: updated.shopping_mall_sender_customer_id },
        })
      : null,
    updated.shopping_mall_sender_seller_id
      ? MyGlobal.prisma.shopping_mall_sellers.findUnique({
          where: { id: updated.shopping_mall_sender_seller_id },
        })
      : null,
    updated.shopping_mall_sender_admin_id
      ? MyGlobal.prisma.shopping_mall_admins.findUnique({
          where: { id: updated.shopping_mall_sender_admin_id },
        })
      : null,
    updated.shopping_mall_receiver_customer_id
      ? MyGlobal.prisma.shopping_mall_customers.findUnique({
          where: { id: updated.shopping_mall_receiver_customer_id },
        })
      : null,
    updated.shopping_mall_receiver_seller_id
      ? MyGlobal.prisma.shopping_mall_sellers.findUnique({
          where: { id: updated.shopping_mall_receiver_seller_id },
        })
      : null,
    updated.shopping_mall_receiver_admin_id
      ? MyGlobal.prisma.shopping_mall_admins.findUnique({
          where: { id: updated.shopping_mall_receiver_admin_id },
        })
      : null,
  ]);
  return {
    id: updated.id,
    shopping_mall_dispute_id: updated.shopping_mall_dispute_id,
    sender_admin: senderAdmin
      ? { id: senderAdmin.id, name: senderAdmin.name, email: senderAdmin.email }
      : undefined,
    sender_seller: senderSeller
      ? { id: senderSeller.id, business_name: senderSeller.business_name }
      : undefined,
    sender_customer: senderCustomer
      ? { id: senderCustomer.id, name: senderCustomer.name }
      : undefined,
    receiver_admin: receiverAdmin
      ? {
          id: receiverAdmin.id,
          name: receiverAdmin.name,
          email: receiverAdmin.email,
        }
      : undefined,
    receiver_seller: receiverSeller
      ? { id: receiverSeller.id, business_name: receiverSeller.business_name }
      : undefined,
    receiver_customer: receiverCustomer
      ? { id: receiverCustomer.id, name: receiverCustomer.name }
      : undefined,
    role: updated.role,
    content: updated.content,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at:
      typeof updated.deleted_at === "string"
        ? updated.deleted_at
        : updated.deleted_at !== null && updated.deleted_at !== undefined
          ? toISOStringSafe(updated.deleted_at)
          : null,
  };
}

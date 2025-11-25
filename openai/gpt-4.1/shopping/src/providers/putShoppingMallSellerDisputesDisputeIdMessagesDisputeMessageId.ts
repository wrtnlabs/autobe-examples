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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerDisputesDisputeIdMessagesDisputeMessageId(props: {
  seller: SellerPayload;
  disputeId: string & tags.Format<"uuid">;
  disputeMessageId: string & tags.Format<"uuid">;
  body: IShoppingMallDisputeMessage.IUpdate;
}): Promise<IShoppingMallDisputeMessage> {
  const message =
    await MyGlobal.prisma.shopping_mall_dispute_messages.findUnique({
      where: { id: props.disputeMessageId },
    });

  if (!message || message.deleted_at !== null) {
    throw new HttpException(
      "Dispute message not found or already deleted.",
      404,
    );
  }
  if (message.shopping_mall_dispute_id !== props.disputeId) {
    throw new HttpException(
      "Message does not belong to the specified dispute.",
      404,
    );
  }
  if (message.shopping_mall_sender_seller_id !== props.seller.id) {
    throw new HttpException(
      "You can only update your own dispute messages.",
      403,
    );
  }

  const updateData: {
    content?: string;
    role?: string;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (typeof props.body.content === "string") {
    updateData.content = props.body.content;
  }
  if (typeof props.body.role === "string") {
    updateData.role = props.body.role;
  }

  const updated = await MyGlobal.prisma.shopping_mall_dispute_messages.update({
    where: { id: props.disputeMessageId },
    data: updateData,
  });

  const [senderSeller, receiverSeller] = await Promise.all([
    updated.shopping_mall_sender_seller_id
      ? MyGlobal.prisma.shopping_mall_sellers.findUnique({
          where: { id: updated.shopping_mall_sender_seller_id },
        })
      : Promise.resolve(undefined),
    updated.shopping_mall_receiver_seller_id
      ? MyGlobal.prisma.shopping_mall_sellers.findUnique({
          where: { id: updated.shopping_mall_receiver_seller_id },
        })
      : Promise.resolve(undefined),
  ]);

  return {
    id: updated.id,
    shopping_mall_dispute_id: updated.shopping_mall_dispute_id,
    sender_admin: undefined,
    sender_seller:
      senderSeller !== null && senderSeller !== undefined
        ? { id: senderSeller.id, business_name: senderSeller.business_name }
        : undefined,
    sender_customer: undefined,
    receiver_admin: undefined,
    receiver_seller:
      receiverSeller !== null && receiverSeller !== undefined
        ? { id: receiverSeller.id, business_name: receiverSeller.business_name }
        : undefined,
    receiver_customer: undefined,
    role: updated.role,
    content: updated.content,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at:
      updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}

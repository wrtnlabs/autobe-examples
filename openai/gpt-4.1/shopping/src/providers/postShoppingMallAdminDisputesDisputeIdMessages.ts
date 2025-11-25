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

export async function postShoppingMallAdminDisputesDisputeIdMessages(props: {
  admin: AdminPayload;
  disputeId: string & tags.Format<"uuid">;
  body: IShoppingMallDisputeMessage.ICreate;
}): Promise<IShoppingMallDisputeMessage> {
  const dispute = await MyGlobal.prisma.shopping_mall_disputes.findFirst({
    where: {
      id: props.disputeId,
      deleted_at: null,
    },
  });

  if (!dispute) {
    throw new HttpException("Dispute not found.", 404);
  }
  if (
    !dispute.shopping_mall_admin_id ||
    dispute.shopping_mall_admin_id !== props.admin.id
  ) {
    throw new HttpException(
      "Forbidden: You are not authorized to send messages in this dispute.",
      403,
    );
  }
  if (
    !props.body.role ||
    !props.body.content ||
    !props.body.shopping_mall_sender_admin_id ||
    props.body.shopping_mall_sender_admin_id !== props.admin.id
  ) {
    throw new HttpException("Invalid sender or missing role/content.", 400);
  }
  const now = toISOStringSafe(new Date());
  const messageId = v4();
  const created = await MyGlobal.prisma.shopping_mall_dispute_messages.create({
    data: {
      id: messageId,
      shopping_mall_dispute_id: props.disputeId,
      role: props.body.role,
      content: props.body.content,
      created_at: now,
      deleted_at: null,
      shopping_mall_sender_admin_id: props.admin.id,
      shopping_mall_sender_seller_id: null,
      shopping_mall_sender_customer_id: null,
      shopping_mall_receiver_admin_id:
        props.body.shopping_mall_receiver_admin_id ?? null,
      shopping_mall_receiver_seller_id:
        props.body.shopping_mall_receiver_seller_id ?? null,
      shopping_mall_receiver_customer_id:
        props.body.shopping_mall_receiver_customer_id ?? null,
    },
    include: {
      senderAdmin: true,
      senderSeller: true,
      senderCustomer: true,
      receiverAdmin: true,
      receiverSeller: true,
      receiverCustomer: true,
    },
  });

  return {
    id: created.id,
    shopping_mall_dispute_id: created.shopping_mall_dispute_id,
    sender_admin: created.senderAdmin
      ? {
          id: created.senderAdmin.id,
          name: created.senderAdmin.name,
          email: created.senderAdmin.email,
        }
      : undefined,
    sender_seller: undefined,
    sender_customer: undefined,
    receiver_admin: created.receiverAdmin
      ? {
          id: created.receiverAdmin.id,
          name: created.receiverAdmin.name,
          email: created.receiverAdmin.email,
        }
      : undefined,
    receiver_seller: created.receiverSeller
      ? {
          id: created.receiverSeller.id,
          business_name: created.receiverSeller.business_name,
        }
      : undefined,
    receiver_customer: created.receiverCustomer
      ? {
          id: created.receiverCustomer.id,
          name: created.receiverCustomer.name,
        }
      : undefined,
    role: created.role,
    content: created.content,
    created_at: toISOStringSafe(created.created_at),
    deleted_at:
      created.deleted_at != null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}

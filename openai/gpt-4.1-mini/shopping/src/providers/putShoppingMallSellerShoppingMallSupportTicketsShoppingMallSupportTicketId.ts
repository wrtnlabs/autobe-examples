import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerShoppingMallSupportTicketsShoppingMallSupportTicketId(props: {
  seller: SellerPayload;
  shoppingMallSupportTicketId: string & tags.Format<"uuid">;
  body: IShoppingMallSupportTicket.IUpdate;
}): Promise<IShoppingMallSupportTicket> {
  const existing =
    await MyGlobal.prisma.shopping_mall_support_tickets.findUnique({
      where: { id: props.shoppingMallSupportTicketId },
    });

  if (!existing) {
    throw new HttpException("Support ticket not found", 404);
  }

  if (existing.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.shopping_mall_support_tickets.update({
    where: { id: props.shoppingMallSupportTicketId },
    data: {
      title: props.body.title ?? existing.title,
      description: props.body.description ?? existing.description,
      status: props.body.status ?? existing.status,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    title: updated.title,
    description: updated.description,
    status: updated.status,
    shopping_mall_customer_id:
      updated.shopping_mall_customer_id === null
        ? undefined
        : updated.shopping_mall_customer_id,
    shopping_mall_seller_id:
      updated.shopping_mall_seller_id === null
        ? undefined
        : updated.shopping_mall_seller_id,
    shopping_mall_customer_session_id:
      updated.shopping_mall_customer_session_id === null
        ? undefined
        : updated.shopping_mall_customer_session_id,
    shopping_mall_seller_session_id:
      updated.shopping_mall_seller_session_id === null
        ? undefined
        : updated.shopping_mall_seller_session_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? null
        : updated.deleted_at !== undefined
          ? toISOStringSafe(updated.deleted_at)
          : undefined,
  };
}

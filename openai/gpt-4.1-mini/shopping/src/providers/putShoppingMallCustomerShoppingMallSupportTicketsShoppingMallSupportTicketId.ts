import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerShoppingMallSupportTicketsShoppingMallSupportTicketId(props: {
  customer: CustomerPayload;
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
  if (existing.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.shopping_mall_support_tickets.update({
    where: { id: props.shoppingMallSupportTicketId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
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
        ? null
        : (updated.shopping_mall_customer_id ?? undefined),
    shopping_mall_seller_id:
      updated.shopping_mall_seller_id === null
        ? null
        : (updated.shopping_mall_seller_id ?? undefined),
    shopping_mall_customer_session_id:
      updated.shopping_mall_customer_session_id === null
        ? null
        : (updated.shopping_mall_customer_session_id ?? undefined),
    shopping_mall_seller_session_id:
      updated.shopping_mall_seller_session_id === null
        ? null
        : (updated.shopping_mall_seller_session_id ?? undefined),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? null
        : updated.deleted_at
          ? toISOStringSafe(updated.deleted_at)
          : undefined,
  };
}

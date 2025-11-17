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

export async function getShoppingMallCustomerShoppingMallSupportTicketsShoppingMallSupportTicketId(props: {
  customer: CustomerPayload;
  shoppingMallSupportTicketId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSupportTicket> {
  const ticket = await MyGlobal.prisma.shopping_mall_support_tickets.findUnique(
    {
      where: { id: props.shoppingMallSupportTicketId },
    },
  );

  if (!ticket) {
    throw new HttpException("Support ticket not found", 404);
  }

  if (ticket.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Access to this ticket is forbidden", 403);
  }

  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    shopping_mall_customer_id: ticket.shopping_mall_customer_id ?? undefined,
    shopping_mall_seller_id: ticket.shopping_mall_seller_id ?? undefined,
    shopping_mall_customer_session_id:
      ticket.shopping_mall_customer_session_id ?? undefined,
    shopping_mall_seller_session_id:
      ticket.shopping_mall_seller_session_id ?? undefined,
    created_at: toISOStringSafe(ticket.created_at),
    updated_at: toISOStringSafe(ticket.updated_at),
    deleted_at: ticket.deleted_at ? toISOStringSafe(ticket.deleted_at) : null,
  };
}

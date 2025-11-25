import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";
import { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminSupportTicketsTicketId(props: {
  admin: AdminPayload;
  ticketId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSupportTicket> {
  const ticket = await MyGlobal.prisma.shopping_mall_support_tickets.findUnique(
    {
      where: {
        id: props.ticketId,
        deleted_at: null,
      },
      include: {
        inquiry: {
          select: {
            id: true,
            title: true,
            body: true,
            inquiry_type: true,
            priority: true,
            status: true,
            created_at: true,
          },
        },
        assignedAdministrator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            role: true,
          },
        },
      },
    },
  );

  if (!ticket) {
    throw new HttpException("Support ticket not found", 404);
  }

  return {
    id: ticket.id,
    ticket_number: ticket.ticket_number,
    title: ticket.title,
    description: ticket.description,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    sla_deadline: ticket.sla_deadline
      ? toISOStringSafe(ticket.sla_deadline)
      : undefined,
    resolution_notes: ticket.resolution_notes ?? undefined,
    inquiry: ticket.inquiry
      ? {
          id: ticket.inquiry.id,
          title: ticket.inquiry.title,
          body: ticket.inquiry.body,
          inquiry_type: ticket.inquiry.inquiry_type,
          priority: ticket.inquiry.priority,
          status: ticket.inquiry.status,
          created_at: toISOStringSafe(ticket.inquiry.created_at),
        }
      : undefined,
    assigned_administrator: ticket.assignedAdministrator
      ? {
          id: ticket.assignedAdministrator.id,
          name: `${ticket.assignedAdministrator.first_name} ${ticket.assignedAdministrator.last_name}`,
          email: ticket.assignedAdministrator.email,
          role: ticket.assignedAdministrator.role,
        }
      : undefined,
    shopping_mall_inquiry_id: ticket.shopping_mall_inquiry_id ?? undefined,
    shopping_mall_administrator_id:
      ticket.shopping_mall_administrator_id ?? undefined,
    created_at: toISOStringSafe(ticket.created_at),
    updated_at: toISOStringSafe(ticket.updated_at),
    resolved_at: ticket.resolved_at
      ? toISOStringSafe(ticket.resolved_at)
      : undefined,
    closed_at: ticket.closed_at ? toISOStringSafe(ticket.closed_at) : undefined,
    deleted_at: ticket.deleted_at
      ? toISOStringSafe(ticket.deleted_at)
      : undefined,
  };
}

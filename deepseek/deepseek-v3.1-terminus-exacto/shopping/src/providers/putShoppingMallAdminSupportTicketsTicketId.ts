import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function putShoppingMallAdminSupportTicketsTicketId(props: {
  admin: AdminPayload;
  ticketId: string & tags.Format<"uuid">;
  body: IShoppingMallSupportTicket.IUpdate;
}): Promise<IShoppingMallSupportTicket> {
  // Verify the ticket exists
  const existingTicket =
    await MyGlobal.prisma.shopping_mall_support_tickets.findUnique({
      where: { id: props.ticketId },
    });

  if (!existingTicket) {
    throw new HttpException("Support ticket not found", 404);
  }

  // Handle status transitions with timestamp updates
  const statusUpdates: Record<string, string | undefined> = {};
  if (
    props.body.status !== undefined &&
    props.body.status !== existingTicket.status
  ) {
    statusUpdates.status = props.body.status;

    if (
      props.body.status === "resolved" &&
      existingTicket.status !== "resolved"
    ) {
      statusUpdates.resolved_at = toISOStringSafe(new Date());
    }

    if (props.body.status === "closed" && existingTicket.status !== "closed") {
      statusUpdates.closed_at = toISOStringSafe(new Date());
    }
  }

  // Perform the update with inline parameters
  const updatedTicket =
    await MyGlobal.prisma.shopping_mall_support_tickets.update({
      where: { id: props.ticketId },
      data: {
        ...(props.body.title !== undefined && { title: props.body.title }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.category !== undefined && {
          category: props.body.category,
        }),
        ...(props.body.priority !== undefined && {
          priority: props.body.priority,
        }),
        ...statusUpdates,
        ...(props.body.sla_deadline !== undefined && {
          sla_deadline: props.body.sla_deadline,
        }),
        ...(props.body.resolution_notes !== undefined && {
          resolution_notes: props.body.resolution_notes,
        }),
        ...(props.body.shopping_mall_inquiry_id !== undefined && {
          shopping_mall_inquiry_id: props.body.shopping_mall_inquiry_id,
        }),
        ...(props.body.shopping_mall_administrator_id !== undefined && {
          shopping_mall_administrator_id:
            props.body.shopping_mall_administrator_id,
        }),
        ...(props.body.resolved_at !== undefined && {
          resolved_at: props.body.resolved_at,
        }),
        ...(props.body.closed_at !== undefined && {
          closed_at: props.body.closed_at,
        }),
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Load related entities if they exist
  const [inquiry, assignedAdministrator] = await Promise.all([
    updatedTicket.shopping_mall_inquiry_id
      ? MyGlobal.prisma.shopping_mall_inquiries.findUnique({
          where: { id: updatedTicket.shopping_mall_inquiry_id },
        })
      : Promise.resolve(null),
    updatedTicket.shopping_mall_administrator_id
      ? MyGlobal.prisma.shopping_mall_administrators.findUnique({
          where: { id: updatedTicket.shopping_mall_administrator_id },
        })
      : Promise.resolve(null),
  ]);

  // Convert to API response format
  return {
    id: updatedTicket.id,
    ticket_number: updatedTicket.ticket_number,
    title: updatedTicket.title,
    description: updatedTicket.description,
    category: updatedTicket.category,
    priority: updatedTicket.priority,
    status: updatedTicket.status,
    sla_deadline:
      updatedTicket.sla_deadline === null
        ? undefined
        : toISOStringSafe(updatedTicket.sla_deadline),
    resolution_notes:
      updatedTicket.resolution_notes === null
        ? undefined
        : updatedTicket.resolution_notes,
    inquiry: inquiry
      ? {
          id: inquiry.id,
          title: inquiry.title,
          body: inquiry.body,
          inquiry_type: inquiry.inquiry_type,
          priority: inquiry.priority,
          status: inquiry.status,
          created_at: toISOStringSafe(inquiry.created_at),
        }
      : undefined,
    assigned_administrator: assignedAdministrator
      ? {
          id: assignedAdministrator.id,
          name: `${assignedAdministrator.first_name} ${assignedAdministrator.last_name}`,
          email: assignedAdministrator.email,
          role: assignedAdministrator.role,
        }
      : undefined,
    shopping_mall_inquiry_id:
      updatedTicket.shopping_mall_inquiry_id === null
        ? undefined
        : updatedTicket.shopping_mall_inquiry_id,
    shopping_mall_administrator_id:
      updatedTicket.shopping_mall_administrator_id === null
        ? undefined
        : updatedTicket.shopping_mall_administrator_id,
    created_at: toISOStringSafe(updatedTicket.created_at),
    updated_at: toISOStringSafe(updatedTicket.updated_at),
    resolved_at:
      updatedTicket.resolved_at === null
        ? undefined
        : toISOStringSafe(updatedTicket.resolved_at),
    closed_at:
      updatedTicket.closed_at === null
        ? undefined
        : toISOStringSafe(updatedTicket.closed_at),
    deleted_at:
      updatedTicket.deleted_at === null
        ? undefined
        : toISOStringSafe(updatedTicket.deleted_at),
  };
}

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

export async function postShoppingMallAdminSupportTickets(props: {
  admin: AdminPayload;
  body: IShoppingMallSupportTicket.ICreate;
}): Promise<IShoppingMallSupportTicket> {
  // Validate priority and category values
  const validPriorities = ["low", "medium", "high", "critical"];
  if (!validPriorities.includes(props.body.priority)) {
    throw new HttpException("Invalid priority value", 400);
  }

  const validCategories = [
    "technical_issue",
    "billing_problem",
    "account_security",
    "product_question",
    "general_feedback",
  ];
  if (!validCategories.includes(props.body.category)) {
    throw new HttpException("Invalid category value", 400);
  }

  // Generate unique ticket number without Date type
  const now = toISOStringSafe(new Date());
  const datePart = now.slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const ticketNumber = `TKT-${datePart}-${randomPart}`;

  // Calculate SLA deadline based on priority
  const slaDeadline = calculateSLADeadline(props.body.priority);

  // Create the support ticket
  const created = await MyGlobal.prisma.shopping_mall_support_tickets.create({
    data: {
      id: v4(),
      ticket_number: ticketNumber,
      title: props.body.title,
      description: props.body.description,
      category: props.body.category,
      priority: props.body.priority,
      status: "new",
      sla_deadline: slaDeadline,
      shopping_mall_inquiry_id: props.body.shopping_mall_inquiry_id,
      shopping_mall_administrator_id: props.admin.id,
      created_at: now,
      updated_at: now,
    },
  });

  // Return the created ticket with proper typing
  return {
    id: created.id,
    ticket_number: created.ticket_number,
    title: created.title,
    description: created.description,
    category: created.category,
    priority: created.priority,
    status: created.status,
    sla_deadline: created.sla_deadline
      ? toISOStringSafe(created.sla_deadline)
      : undefined,
    resolution_notes: created.resolution_notes ?? undefined,
    inquiry: undefined,
    assigned_administrator: undefined,
    shopping_mall_inquiry_id: created.shopping_mall_inquiry_id ?? undefined,
    shopping_mall_administrator_id:
      created.shopping_mall_administrator_id ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    resolved_at: created.resolved_at
      ? toISOStringSafe(created.resolved_at)
      : undefined,
    closed_at: created.closed_at
      ? toISOStringSafe(created.closed_at)
      : undefined,
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}

// Helper function to calculate SLA deadline based on priority
function calculateSLADeadline(priority: string): string | null {
  const now = new Date();
  let deadline: Date;

  switch (priority) {
    case "critical":
      deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      break;
    case "high":
      deadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
      break;
    case "medium":
      deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      break;
    case "low":
      deadline = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days
      break;
    default:
      return null;
  }

  return toISOStringSafe(deadline);
}

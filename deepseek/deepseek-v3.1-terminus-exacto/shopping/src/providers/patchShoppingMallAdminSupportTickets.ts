import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";
import { IPageIShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSupportTicket";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSupportTickets(props: {
  admin: AdminPayload;
  body: IShoppingMallSupportTicket.IRequest;
}): Promise<IPageIShoppingMallSupportTicket.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where condition for filtering
  const where: Record<string, unknown> = {
    deleted_at: null,
  };

  // Add text search filter
  if (props.body.search) {
    where.OR = [
      { title: { contains: props.body.search } },
      { description: { contains: props.body.search } },
    ];
  }

  // Add category filter
  if (props.body.category) {
    where.category = props.body.category;
  }

  // Add priority filter
  if (props.body.priority) {
    where.priority = props.body.priority;
  }

  // Add status filter
  if (props.body.status) {
    where.status = props.body.status;
  }

  // Add assigned administrator filter
  if (props.body.assigned_administrator_id) {
    where.shopping_mall_administrator_id = props.body.assigned_administrator_id;
  }

  // Add date range filters - use ISO strings directly
  if (props.body.created_from || props.body.created_to) {
    where.created_at = {} satisfies Record<string, unknown> as Record<
      string,
      unknown
    >;
    if (props.body.created_from) {
      (where.created_at as Record<string, unknown>).gte =
        props.body.created_from;
    }
    if (props.body.created_to) {
      (where.created_at as Record<string, unknown>).lte = props.body.created_to;
    }
  }

  // Build orderBy for sorting
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (props.body.sort_by) {
    orderBy = {};
    orderBy[props.body.sort_by] = props.body.order ?? "desc";
  }

  // Execute queries concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_support_tickets.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_support_tickets.count({ where }),
  ]);

  // Transform data to match ISummary interface
  const summaryData: IShoppingMallSupportTicket.ISummary[] = data.map(
    (ticket) => ({
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      title: ticket.title,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      shopping_mall_inquiry_id:
        ticket.shopping_mall_inquiry_id === null
          ? undefined
          : ticket.shopping_mall_inquiry_id,
      created_at: toISOStringSafe(ticket.created_at),
      updated_at: ticket.updated_at
        ? toISOStringSafe(ticket.updated_at)
        : undefined,
    }),
  );

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: summaryData,
  };
}

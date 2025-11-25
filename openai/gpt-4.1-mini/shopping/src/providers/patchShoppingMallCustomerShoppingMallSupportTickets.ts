import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSupportTicket";
import { IPageIShoppingMallSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSupportTicket";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerShoppingMallSupportTickets(props: {
  customer: CustomerPayload;
  body: IShoppingMallSupportTicket.IRequest;
}): Promise<IPageIShoppingMallSupportTicket.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.shopping_mall_support_ticketsWhereInput = {
    deleted_at: null,
    status: props.body.status ?? undefined,
    AND: [],
  };

  if (props.body.submitter_type === "customer") {
    where.shopping_mall_customer_id = props.customer.id;
  } else if (props.body.submitter_type === "seller") {
    where.shopping_mall_seller_id = { not: null };
  }

  if (props.body.created_from || props.body.created_to) {
    where.created_at = {};
    if (props.body.created_from) where.created_at.gte = props.body.created_from;
    if (props.body.created_to) where.created_at.lte = props.body.created_to;
  }
  if (props.body.updated_from || props.body.updated_to) {
    where.updated_at = {};
    if (props.body.updated_from) where.updated_at.gte = props.body.updated_from;
    if (props.body.updated_to) where.updated_at.lte = props.body.updated_to;
  }

  if (props.body.search) {
    where.OR = [
      { title: { contains: props.body.search } },
      { description: { contains: props.body.search } },
    ];
  }

  const [tickets, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_support_tickets.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ created_at: "desc" }],
      select: {
        id: true,
        title: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_support_tickets.count({ where }),
  ]);

  return {
    data: tickets.map((ticket) => ({
      id: ticket.id satisfies string & tags.Format<"uuid"> as string &
        tags.Format<"uuid">,
      title: ticket.title,
      status: ticket.status,
      created_at: toISOStringSafe(ticket.created_at) satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
      updated_at: toISOStringSafe(ticket.updated_at) satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
    })),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
  };
}

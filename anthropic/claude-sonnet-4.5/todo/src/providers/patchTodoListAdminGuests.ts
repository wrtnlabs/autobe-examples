import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import { IPageITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminGuests(props: {
  admin: AdminPayload;
  body: ITodoListGuest.IRequest;
}): Promise<IPageITodoListGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {};

  if (props.body.search) {
    whereCondition.OR = [{ ip_address: { contains: props.body.search } }];
  }

  if (props.body.ip_address && !props.body.search) {
    whereCondition.ip_address = { contains: props.body.ip_address };
  } else if (props.body.ip_address && props.body.search) {
    whereCondition.AND = [
      {
        OR: [{ ip_address: { contains: props.body.search } }],
      },
      { ip_address: { contains: props.body.ip_address } },
    ];
    delete whereCondition.OR;
  }

  if (props.body.visit_date_from || props.body.visit_date_to) {
    const visitedAtCondition: Record<string, unknown> = {};
    if (props.body.visit_date_from) {
      visitedAtCondition.gte = props.body.visit_date_from;
    }
    if (props.body.visit_date_to) {
      visitedAtCondition.lte = props.body.visit_date_to;
    }
    whereCondition.visited_at = visitedAtCondition;
  }

  const orderByField = props.body.sort_by ?? "created_at";
  const orderByDirection = props.body.sort_order ?? "desc";
  const orderBy = { [orderByField]: orderByDirection };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_guests.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_list_guests.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((guest) => ({
      id: guest.id,
      ip_address: guest.ip_address === null ? undefined : guest.ip_address,
      user_agent: guest.user_agent === null ? undefined : guest.user_agent,
      visited_at: toISOStringSafe(guest.visited_at),
      created_at: toISOStringSafe(guest.created_at),
    })),
  };
}

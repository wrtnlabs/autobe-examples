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
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function patchTodoListGuestTodoListGuests(props: {
  guest: GuestPayload;
  body: ITodoListGuest.IRequest;
}): Promise<IPageITodoListGuest> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build where condition — let Prisma infer types automatically
  const where: Partial<Prisma.todo_list_guestWhereInput> = {};

  // Status filter: active, expired, or deleted
  if (props.body.status) {
    switch (props.body.status) {
      case "active":
        where.deleted_at = null;
        break;
      case "expired":
        // Expired: deleted_at is not null (per schema) — no time cutoff unless specified in business logic
        where.deleted_at = { not: null };
        break;
      case "deleted":
        // Deleted: same as expired per schema — both mean deleted_at is not null
        where.deleted_at = { not: null };
        break;
    }
  } else {
    // Default: active only
    where.deleted_at = null;
  }

  // Email search filter (partial string match)
  if (props.body.search) {
    where.email = { contains: props.body.search, mode: "insensitive" };
  }

  // Sorting: use inferred types from schema
  const orderBy: Partial<Prisma.todo_list_guestOrderByWithRelationInput> = {};
  if (props.body.sort_by === "email") {
    orderBy.email = props.body.order === "desc" ? "desc" : "asc";
  } else {
    // Default: created_at
    orderBy.created_at = props.body.order === "desc" ? "desc" : "asc";
  }

  // Fetch records and count — use inline parameters
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_guest.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_list_guest.count({ where }),
  ]);

  // Transform data to match API response format — convert dates correctly
  const resultData = data.map((guest) => ({
    email: guest.email,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: resultData,
  };
}

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuest";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppGuestAtSummaryTransformer } from "../transformers/TodoAppGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppGuests(props: {
  body: ITodoAppGuest.IRequest;
}): Promise<IPageITodoAppGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const whereInput: Prisma.todo_app_guestsWhereInput = {
    ...(props.body.device_fingerprint !== undefined && {
      device_fingerprint: {
        contains: props.body.device_fingerprint,
        mode: "insensitive",
      },
    }),
    ...(props.body.created_at_gte !== undefined && {
      created_at: {
        gte: props.body.created_at_gte,
      },
    }),
    ...(props.body.created_at_lte !== undefined && {
      created_at: {
        lte: props.body.created_at_lte,
      },
    }),
    deleted_at: props.body.deleted_at === null ? null : undefined,
    ...(props.body.deleted_at !== undefined &&
      props.body.deleted_at !== null && {
        deleted_at: {
          not: null,
        },
      }),
  };
  const validSortFields = ["created_at", "device_fingerprint", "deleted_at"];
  const validSortOrders = ["asc", "desc"] as const;
  const orderByInput: Prisma.todo_app_guestsOrderByWithRelationInput =
    validSortFields.includes(sortBy) &&
    validSortOrders.includes(sortOrder as "asc" | "desc")
      ? { [sortBy]: sortOrder as "asc" | "desc" }
      : { created_at: "desc" };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.todo_app_guests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...TodoAppGuestAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.todo_app_guests.count({
      where: whereInput,
    }),
  ]);
  const pages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data: await ArrayUtil.asyncMap(
      records,
      TodoAppGuestAtSummaryTransformer.transform,
    ),
  } satisfies IPageITodoAppGuest.ISummary;
}

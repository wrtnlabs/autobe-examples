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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppGuests(props: {
  body: ITodoAppGuest.IRequest;
}): Promise<IPageITodoAppGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.todo_app_guestsWhereInput = {
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        device_fingerprint: { contains: props.body.search },
      }),
    ...(props.body.created_at_from !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
    ...(props.body.updated_at_from !== undefined && {
      updated_at: {
        gte: new Date(props.body.updated_at_from),
      },
    }),
    ...(props.body.updated_at_to !== undefined && {
      updated_at: {
        lte: new Date(props.body.updated_at_to),
      },
    }),
    ...(props.body.deleted !== undefined && {
      deleted_at: props.body.deleted ? { not: null } : null,
    }),
  } satisfies Prisma.todo_app_guestsWhereInput;
  const sortParts = (props.body.sort ?? "created_at DESC").split(" ");
  const sortField = sortParts[0] ?? "created_at";
  const sortDirection = (sortParts[1] ?? "DESC").toLowerCase() as
    | "asc"
    | "desc";
  const orderByInput = {
    [sortField]: sortDirection,
  } satisfies Prisma.todo_app_guestsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.todo_app_guests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      device_fingerprint: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.todo_app_guests.count({
    where: whereInput,
  });
  return {
    data: data.map((guest) => ({
      id: guest.id satisfies string & tags.Format<"uuid">,
      device_fingerprint: guest.device_fingerprint,
      created_at: toISOStringSafe(guest.created_at),
      updated_at: toISOStringSafe(guest.updated_at),
      deleted_at:
        guest.deleted_at === null ? null : toISOStringSafe(guest.deleted_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}

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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppGuestGuests(props: {
  guest: GuestPayload;
  body: ITodoAppGuest.IRequest;
}): Promise<IPageITodoAppGuest.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const records = await MyGlobal.prisma.todo_app_guests.findMany({
    where: {
      deleted_at: null,
    },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total: number = await MyGlobal.prisma.todo_app_guests.count({
    where: {
      deleted_at: null,
    },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      created_at: record.created_at.toISOString(),
      updated_at: record.updated_at.toISOString(),
      deleted_at:
        record.deleted_at === null ? null : record.deleted_at.toISOString(),
    })),
  };
}

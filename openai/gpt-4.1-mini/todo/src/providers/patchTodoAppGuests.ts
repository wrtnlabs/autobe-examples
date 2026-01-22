import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { IPageITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchTodoAppGuests(props: {
  body: ITodoAppGuest.IRequest;
}): Promise<IPageITodoAppGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    AND: [
      { deleted_at: null },
      ...(props.body.createdAfter || props.body.createdBefore
        ? [
            {
              created_at: {
                ...(props.body.createdAfter && {
                  gte: props.body.createdAfter,
                }),
                ...(props.body.createdBefore && {
                  lte: props.body.createdBefore,
                }),
              },
            },
          ]
        : []),
      ...(props.body.searchText
        ? [{ OR: [{ guest_identifier: { contains: props.body.searchText } }] }]
        : []),
    ],
  } satisfies Prisma.todo_app_guestsWhereInput;
  const data = await MyGlobal.prisma.todo_app_guests.findMany({
    where: whereInput,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    select: {
      id: true,
      guest_identifier: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.todo_app_guests.count({
    where: whereInput,
  });
  // Fix pagination properties with satisfies pattern
  const currentPage = page satisfies number as number;
  const limitChecked = limit satisfies number as number;
  const totalChecked = total satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>;
  const pages = Math.ceil(total / limit) satisfies number as number;
  return {
    data: data.map((guest) => ({
      id: guest.id as string & tags.Format<"uuid">,
      guest_identifier: guest.guest_identifier,
      created_at: toISOStringSafe(guest.created_at),
      updated_at:
        guest.updated_at === null ? null : toISOStringSafe(guest.updated_at),
      deleted_at:
        guest.deleted_at === null ? null : toISOStringSafe(guest.deleted_at),
    })),
    pagination: {
      current: currentPage as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limitChecked as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: totalChecked,
      pages: pages as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
  } satisfies IPageITodoAppGuest.ISummary;
}

import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import { IPageITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchTodoAppAdminUserMemberUsers(props: {
  adminUser: AdminuserPayload;
  body: ITodoAppMemberUser.IRequest;
}): Promise<IPageITodoAppMemberUser.ISummary> {
  // Pagination parameters with defaults
  const rawPage = props.body.page;
  const rawLimit = props.body.limit;

  const page = rawPage !== undefined && rawPage !== null ? rawPage : 1;
  const limit = rawLimit !== undefined && rawLimit !== null ? rawLimit : 20;

  const safePage = page < 1 ? 1 : page;
  const safeLimit = limit < 1 ? 20 : limit;

  const skip = (safePage - 1) * safeLimit;

  // Build where condition based on filters
  const where = {
    ...(props.body.status !== undefined && props.body.status !== null
      ? { status: props.body.status }
      : {}),
    ...(() => {
      const createdFrom = props.body.created_from;
      const createdTo = props.body.created_to;

      if (createdFrom === undefined && createdTo === undefined) return {};

      return {
        created_at: {
          ...(createdFrom !== undefined && createdFrom !== null
            ? { gte: createdFrom }
            : {}),
          ...(createdTo !== undefined && createdTo !== null
            ? { lte: createdTo }
            : {}),
        },
      };
    })(),
    ...(() => {
      const search = props.body.search;
      if (search === undefined || search === null || search === "") return {};

      return {
        OR: [
          {
            email: {
              contains: search,
              mode: "insensitive" as Prisma.QueryMode,
            },
          },
          {
            display_name: {
              contains: search,
              mode: "insensitive" as Prisma.QueryMode,
            },
          },
        ],
      };
    })(),
  } satisfies Prisma.todo_app_memberusersWhereInput;

  // Determine sorting
  const orderByField = (() => {
    const orderBy = props.body.order_by;
    if (orderBy === "status") return "status" as const;
    if (orderBy === "created_at") return "created_at" as const;
    return "created_at" as const;
  })();

  const orderDirection = (() => {
    const dir = props.body.order_direction;
    if (dir === "asc" || dir === "ASC") return "asc" as const;
    if (dir === "desc" || dir === "DESC") return "desc" as const;
    return "desc" as const;
  })();

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_memberusers.findMany({
      where,
      skip,
      take: safeLimit,
      orderBy: {
        [orderByField]: orderDirection,
      },
    }),
    MyGlobal.prisma.todo_app_memberusers.count({
      where,
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
  }));

  const pagination: IPage.IPagination = {
    current: safePage,
    limit: safeLimit,
    records: total,
    pages: Math.ceil(total / safeLimit),
  };

  return {
    pagination,
    data,
  };
}

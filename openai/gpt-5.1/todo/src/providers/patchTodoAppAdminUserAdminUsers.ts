import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import { IPageITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchTodoAppAdminUserAdminUsers(props: {
  adminUser: AdminuserPayload;
  body: ITodoAppAdminUser.IRequest;
}): Promise<IPageITodoAppAdminUser.ISummary> {
  const body = props.body;

  const rawPage = body.page !== undefined ? body.page : 1;
  const rawLimit = body.limit !== undefined ? body.limit : 20;

  const page = rawPage < 1 ? 1 : rawPage;
  const limit = rawLimit < 1 ? 20 : rawLimit > 100 ? 100 : rawLimit;

  const skip = (page - 1) * limit;

  const whereCreatedAt = ((): { gte?: string; lte?: string } | undefined => {
    const hasFrom = body.createdFrom !== undefined;
    const hasTo = body.createdTo !== undefined;

    if (!hasFrom && !hasTo) return undefined;

    const range: { gte?: string; lte?: string } = {};

    if (hasFrom) {
      range.gte = body.createdFrom!;
    }

    if (hasTo) {
      range.lte = body.createdTo!;
    }

    return range;
  })();

  const where = {
    ...(body.email !== undefined &&
      body.email !== "" && {
        email: {
          contains: body.email,
          mode: "insensitive" as const,
        },
      }),
    ...(body.status !== undefined &&
      body.status !== "" && {
        status: body.status,
      }),
    ...(whereCreatedAt !== undefined && {
      created_at: whereCreatedAt,
    }),
  };

  const orderByDirection = body.orderByCreatedAt === "asc" ? "asc" : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_adminusers.findMany({
      where,
      orderBy: {
        created_at: orderByDirection,
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_app_adminusers.count({
      where,
    }),
  ]);

  const data: ITodoAppAdminUser.ISummary[] = rows.map((row) => {
    return {
      id: row.id,
      email: row.email,
      display_name: row.display_name,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    };
  });

  const pages = limit === 0 ? 0 : Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
    data,
  };
}

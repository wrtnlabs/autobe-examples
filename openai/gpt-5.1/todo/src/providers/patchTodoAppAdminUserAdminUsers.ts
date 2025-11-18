import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import { IPageITodoAppAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminuser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchTodoAppAdminUserAdminUsers(props: {
  adminUser: AdminuserPayload;
  body: ITodoAppAdminUser.IRequest;
}): Promise<IPageITodoAppAdminuser.ISummary> {
  const body = props.body;

  const rawPage = body.page !== undefined && body.page !== null ? body.page : 0;
  const rawLimit =
    body.limit !== undefined && body.limit !== null ? body.limit : 20;

  const maxLimit = 100;
  const page = rawPage < 0 ? 0 : rawPage;
  const limit = rawLimit <= 0 ? 20 : rawLimit > maxLimit ? maxLimit : rawLimit;

  const skip = page * limit;

  const whereConditions: Prisma.todo_app_adminusersWhereInput = {
    deleted_at: null,
  };

  if (body.status !== undefined && body.status !== null) {
    whereConditions.status = body.status;
  }

  if (
    body.keyword !== undefined &&
    body.keyword !== null &&
    body.keyword !== ""
  ) {
    whereConditions.OR = [
      {
        email: {
          contains: body.keyword,
          mode: "insensitive",
        },
      },
      {
        display_name: {
          contains: body.keyword,
          mode: "insensitive",
        },
      },
    ];
  }

  const hasCreatedFrom =
    body.created_from !== undefined && body.created_from !== null;
  const hasCreatedTo =
    body.created_to !== undefined && body.created_to !== null;

  if (hasCreatedFrom || hasCreatedTo) {
    whereConditions.created_at = {};
    if (hasCreatedFrom) {
      whereConditions.created_at.gte =
        body.created_from! satisfies string as string;
    }
    if (hasCreatedTo) {
      whereConditions.created_at.lte =
        body.created_to! satisfies string as string;
    }
  }

  const orderByFieldRaw =
    body.order_by !== undefined && body.order_by !== null
      ? body.order_by
      : "created_at";

  const orderByField =
    orderByFieldRaw === "email" ||
    orderByFieldRaw === "status" ||
    orderByFieldRaw === "created_at"
      ? orderByFieldRaw
      : "created_at";

  const directionRaw =
    body.order_direction !== undefined && body.order_direction !== null
      ? body.order_direction.toLowerCase()
      : "desc";

  const direction: Prisma.SortOrder = directionRaw === "asc" ? "asc" : "desc";

  let orderBy: Prisma.todo_app_adminusersOrderByWithRelationInput;
  if (orderByField === "email") {
    orderBy = { email: direction };
  } else if (orderByField === "status") {
    orderBy = { status: direction };
  } else {
    orderBy = { created_at: direction };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_adminusers.findMany({
      where: whereConditions,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_app_adminusers.count({
      where: whereConditions,
    }),
  ]);

  const data: ITodoAppAdminUser.ISummary[] = rows.map((row) => {
    const summary: ITodoAppAdminUser.ISummary = {
      id: row.id,
      email: row.email,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    };

    if (row.display_name !== null) {
      summary.display_name = row.display_name;
    } else {
      summary.display_name = null;
    }

    if (row.last_login_at !== null) {
      summary.last_login_at = toISOStringSafe(row.last_login_at);
    } else {
      summary.last_login_at = null;
    }

    return summary;
  });

  const pages = limit > 0 ? Math.ceil(total / limit) : 0;

  const pagination: IPage.IPagination = {
    current: page satisfies number as number,
    limit: limit satisfies number as number,
    records: total,
    pages,
  };

  return {
    pagination,
    data,
  };
}

import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import { IPageITodoAppTodoadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoadmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function patchTodoAppTodoAdminTodoAdmins(props: {
  todoAdmin: TodoadminPayload;
  body: ITodoAppTodoAdmin.IRequest;
}): Promise<IPageITodoAppTodoadmin.ISummary> {
  const pageInput = props.body.page;
  const limitInput = props.body.limit;

  const page = pageInput !== undefined && pageInput !== null ? pageInput : 1;
  const limit =
    limitInput !== undefined && limitInput !== null ? limitInput : 10;

  const skip = (page - 1) * limit;

  const where = (() => {
    const conditions: any = {};

    if (
      props.body.search !== undefined &&
      props.body.search !== null &&
      props.body.search !== ""
    ) {
      const searchValue = props.body.search;
      conditions.OR = [
        { email: { contains: searchValue, mode: "insensitive" } },
        { display_name: { contains: searchValue, mode: "insensitive" } },
      ];
    }

    if (
      props.body.status !== undefined &&
      props.body.status !== null &&
      props.body.status !== ""
    ) {
      conditions.status = props.body.status;
    }

    return conditions;
  })();

  const orderBy = (() => {
    const orderByFieldRaw = props.body.order_by;
    const orderDirectionRaw = props.body.order_direction;

    const allowedFields = [
      "created_at",
      "updated_at",
      "last_login_at",
      "email",
    ];
    const fallbackField = "created_at";

    const field =
      orderByFieldRaw !== undefined &&
      orderByFieldRaw !== null &&
      allowedFields.includes(orderByFieldRaw)
        ? orderByFieldRaw
        : fallbackField;

    const direction =
      orderDirectionRaw !== undefined &&
      orderDirectionRaw !== null &&
      (orderDirectionRaw === "asc" || orderDirectionRaw === "desc")
        ? orderDirectionRaw
        : "desc";

    return { [field]: direction };
  })();

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todoadmins.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_app_todoadmins.count({
      where,
    }),
  ]);

  const data = rows.map((row): ITodoAppTodoAdmin.ISummary => {
    const summary: ITodoAppTodoAdmin.ISummary = {
      id: row.id,
      email: row.email,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    };

    if (row.display_name !== null && row.display_name !== undefined) {
      summary.display_name = row.display_name;
    }

    if (row.last_login_at !== null && row.last_login_at !== undefined) {
      summary.last_login_at = toISOStringSafe(row.last_login_at);
    }

    return summary;
  });

  const pages = total > 0 ? Math.ceil(total / limit) : 0;

  const pagination: IPage.IPagination = {
    current: page - 1,
    limit,
    records: total,
    pages,
  };

  return {
    pagination,
    data,
  };
}

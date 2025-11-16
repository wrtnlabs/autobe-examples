import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import { IPageITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoStatus";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchTodoAppTodoStatuses(props: {
  body: ITodoAppTodoStatus.IRequest;
}): Promise<IPageITodoAppTodoStatus.ISummary> {
  const pageInput = props.body.page;
  const limitInput = props.body.limit;

  const pageNumber: number =
    pageInput !== undefined && pageInput > 0 ? pageInput : 1;
  const limitNumber: number =
    limitInput !== undefined && limitInput > 0 ? limitInput : 20;

  const skip: number = (pageNumber - 1) * limitNumber;

  const where = {
    ...(props.body.isActiveOnly ? { is_active: true } : {}),
    ...(props.body.query && props.body.query.length > 0
      ? {
          OR: [
            { code: { contains: props.body.query } },
            { label: { contains: props.body.query } },
          ],
        }
      : {}),
  };

  const sortKey = props.body.sortKey ?? "sort_order";
  const sortDirection = props.body.sortDirection ?? "asc";

  const orderBy: Prisma.todo_app_todo_statusesOrderByWithRelationInput =
    sortKey === "code"
      ? { code: sortDirection }
      : sortKey === "label"
        ? { label: sortDirection }
        : sortKey === "is_active"
          ? { is_active: sortDirection }
          : { sort_order: sortDirection };

  const [rows, totalCount] = await Promise.all([
    MyGlobal.prisma.todo_app_todo_statuses.findMany({
      where,
      orderBy,
      skip,
      take: limitNumber,
    }),
    MyGlobal.prisma.todo_app_todo_statuses.count({ where }),
  ]);

  const data: ITodoAppTodoStatus.ISummary[] = rows.map((row) => ({
    id: row.id,
    code: row.code,
    label: row.label,
    is_default: row.is_default,
    is_active: row.is_active,
  }));

  const pages: number =
    limitNumber === 0 ? 0 : Math.ceil(totalCount / limitNumber);

  const pagination: IPage.IPagination = {
    current: pageNumber - 1,
    limit: limitNumber,
    records: totalCount,
    pages,
  };

  return {
    pagination,
    data,
  };
}

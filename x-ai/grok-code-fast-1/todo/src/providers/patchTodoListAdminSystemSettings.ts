import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemSetting";
import { IPageITodoListSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListSystemSetting";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminSystemSettings(props: {
  admin: AdminPayload;
  body: ITodoListSystemSetting.IRequest;
}): Promise<IPageITodoListSystemSetting.ISummary> {
  const { page, limit, sort, key, value, version, description } = props.body;
  const skip = (page - 1) * limit;

  // Build dynamic where condition:
  const where = {
    ...(key !== undefined &&
      key !== null &&
      key !== "" && {
        key: { contains: key, mode: "insensitive" as Prisma.QueryMode },
      }),
    ...(value !== undefined &&
      value !== null &&
      value !== "" && {
        value: { contains: value, mode: "insensitive" as Prisma.QueryMode },
      }),
    ...(version !== undefined &&
      version !== null && {
        version: version,
      }),
    ...(description !== undefined &&
      description !== null &&
      description !== "" && {
        description: {
          contains: description,
          mode: "insensitive" as Prisma.QueryMode,
        },
      }),
  };

  // Build dynamic sorting order:
  let orderBy: { [field: string]: "asc" | "desc" }[] = [{ created_at: "desc" }];
  if (sort && typeof sort === "string" && sort.length > 0) {
    const rawSorts = sort
      .split(",")
      .map((f) => f.trim())
      .filter((x) => x);
    orderBy = rawSorts
      .map((sortKey) => {
        const direction = sortKey.startsWith("-") ? "desc" : "asc";
        const fieldName = sortKey.replace(/^-/, "");
        // Only allow known sortable fields
        if (
          ["created_at", "updated_at", "key", "version"].includes(fieldName)
        ) {
          return { [fieldName]: direction };
        }
        // If non-allowed field, skip (filter out)
        return undefined;
      })
      .filter(Boolean) as { [field: string]: "asc" | "desc" }[];
    if (!orderBy.length) orderBy = [{ created_at: "desc" }];
  }

  const [records, total] = await Promise.all([
    MyGlobal.prisma.todo_list_system_settings.findMany({
      where: where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_list_system_settings.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((row) => ({
      id: row.id,
      key: row.key,
      value: row.value,
      version: row.version,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}

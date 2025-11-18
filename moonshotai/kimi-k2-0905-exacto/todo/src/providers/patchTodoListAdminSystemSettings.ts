import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  const {
    key,
    description,
    sort_by = "created_at",
    order = "asc",
    created_from,
    created_to,
    updated_from,
    updated_to,
    page = 1,
    limit = 20,
  } = props.body;
  const cappedLimit = limit && limit > 100 ? 100 : (limit ?? 20);
  const skip = ((page ?? 1) - 1) * cappedLimit;
  // Build created_at range
  let createdAtCondition: Record<string, string> | undefined = undefined;
  if (created_from && created_to) {
    createdAtCondition = { gte: created_from, lte: created_to };
  } else if (created_from) {
    createdAtCondition = { gte: created_from };
  } else if (created_to) {
    createdAtCondition = { lte: created_to };
  }
  // Build updated_at range
  let updatedAtCondition: Record<string, string> | undefined = undefined;
  if (updated_from && updated_to) {
    updatedAtCondition = { gte: updated_from, lte: updated_to };
  } else if (updated_from) {
    updatedAtCondition = { gte: updated_from };
  } else if (updated_to) {
    updatedAtCondition = { lte: updated_to };
  }
  const where: Record<string, unknown> = {
    ...(key && { key: { contains: key } }),
    ...(description && { description: { contains: description } }),
    ...(createdAtCondition && { created_at: createdAtCondition }),
    ...(updatedAtCondition && { updated_at: updatedAtCondition }),
  };
  const sortField = sort_by ?? "created_at";
  const sortDir = order ?? "asc";
  const orderBy: Record<string, "asc" | "desc"> = { [sortField]: sortDir };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.todo_list_system_settings.findMany({
      where,
      orderBy,
      skip,
      take: cappedLimit,
    }),
    MyGlobal.prisma.todo_list_system_settings.count({ where }),
  ]);
  return {
    pagination: {
      current: page,
      limit: cappedLimit,
      records: total,
      pages: Math.ceil(total / cappedLimit),
    },
    data: records.map((setting) => ({
      id: setting.id,
      key: setting.key,
      value: setting.value,
      description: setting.description === null ? null : setting.description,
    })),
  };
}

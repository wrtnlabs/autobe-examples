import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import { IPageITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemSetting";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminSystemSettings(props: {
  admin: AdminPayload;
  body: ITodoAppSystemSetting.IRequest;
}): Promise<IPageITodoAppSystemSetting.ISummary> {
  const { admin, body } = props;

  // Pagination defaults and numeric normalization
  const page = Number((body.page ?? 1) as unknown) as number;
  const pageSize = Number((body.pageSize ?? 25) as unknown) as number;
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // Validate sortBy
  if (
    body.sortBy !== undefined &&
    body.sortBy !== "createdAt" &&
    body.sortBy !== "updatedAt" &&
    body.sortBy !== "key"
  ) {
    throw new HttpException("Bad Request: invalid sortBy", 400);
  }

  // Map sortBy to prisma field name
  const sortField =
    body.sortBy === "updatedAt"
      ? "updated_at"
      : body.sortBy === "key"
        ? "key"
        : "created_at";
  const sortOrder = body.sortOrder === "desc" ? "desc" : "asc";

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.todo_app_system_settings.findMany({
        where: {
          ...(body.includeDeleted !== true && { deleted_at: null }),
          ...(body.key !== undefined && { key: body.key }),
          ...(body.keyPrefix !== undefined && {
            key: { startsWith: body.keyPrefix },
          }),
          ...(body.isPublic !== undefined && { is_public: body.isPublic }),
          ...(body.search !== undefined &&
            body.search !== null && { description: { contains: body.search } }),
        },
        orderBy: { [sortField]: sortOrder },
        skip,
        take,
        select: {
          id: true,
          key: true,
          value: true,
          description: true,
          is_public: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      }),
      MyGlobal.prisma.todo_app_system_settings.count({
        where: {
          ...(body.includeDeleted !== true && { deleted_at: null }),
          ...(body.key !== undefined && { key: body.key }),
          ...(body.keyPrefix !== undefined && {
            key: { startsWith: body.keyPrefix },
          }),
          ...(body.isPublic !== undefined && { is_public: body.isPublic }),
          ...(body.search !== undefined &&
            body.search !== null && { description: { contains: body.search } }),
        },
      }),
    ]);

    // Audit the listing action
    await MyGlobal.prisma.todo_app_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_admin_id: admin.id,
        todo_app_admin_session_id: admin.session_id,
        event_type: "settings.list",
        details: JSON.stringify({ filters: body }),
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });

    const data = rows.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      key: r.key,
      value: r.value,
      description: r.description ?? null,
      isPublic: r.is_public,
      createdAt: toISOStringSafe(r.created_at),
      updatedAt: toISOStringSafe(r.updated_at),
      deletedAt: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    }));

    return {
      pagination: {
        current: Number(page),
        limit: Number(pageSize),
        records: total,
        pages: Math.ceil(total / pageSize),
      },
      data,
    };
  } catch (error) {
    // Do not leak internal error details
    throw new HttpException("Internal Server Error", 500);
  }
}

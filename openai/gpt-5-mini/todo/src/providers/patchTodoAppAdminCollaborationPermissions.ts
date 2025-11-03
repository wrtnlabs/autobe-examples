import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppCollaborationPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCollaborationPermission";
import { IPageITodoAppCollaborationPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppCollaborationPermission";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminCollaborationPermissions(props: {
  admin: AdminPayload;
  body: ITodoAppCollaborationPermission.IRequest;
}): Promise<IPageITodoAppCollaborationPermission.ISummary> {
  const { admin, body } = props;

  // Authorization check: ensure admin is active and not deleted
  const adminRecord = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: admin.id },
    select: { is_active: true, deleted_at: true },
  });

  if (
    !adminRecord ||
    !adminRecord.is_active ||
    adminRecord.deleted_at !== null
  ) {
    throw new HttpException("Unauthorized: admin account inactive", 403);
  }

  // Pagination defaults and limits
  const page = Number(body.page ?? 1);
  const pageSize = Number(body.pageSize ?? 25);

  if (page <= 0) throw new HttpException("Bad Request: page must be >= 1", 400);
  if (pageSize <= 0)
    throw new HttpException("Bad Request: pageSize must be >= 1", 400);
  if (pageSize > 200)
    throw new HttpException("Bad Request: pageSize must be <= 200", 400);

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // Determine orderBy inline (Prisma-compatible, no mode)
  const orderBy: Prisma.todo_app_collaboration_permissionsOrderByWithRelationInput =
    body.sortBy === "code"
      ? { code: (body.order === "desc" ? "desc" : "asc") as Prisma.SortOrder }
      : body.sortBy === "updatedAt"
        ? {
            updated_at: (body.order === "desc"
              ? "desc"
              : "asc") as Prisma.SortOrder,
          }
        : {
            created_at: (body.order === "desc"
              ? "desc"
              : "asc") as Prisma.SortOrder,
          };

  // Run queries in parallel; build where inline for both operations
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_collaboration_permissions.findMany({
      where: {
        ...(body.code !== undefined &&
          body.code !== null && { code: { contains: body.code } }),
        ...(body.isGrantable !== undefined &&
          body.isGrantable !== null && { is_grantable: body.isGrantable }),
        ...(body.description !== undefined &&
          body.description !== null && {
            description: { contains: body.description },
          }),
      },
      select: {
        id: true,
        code: true,
        description: true,
        is_grantable: true,
        created_at: true,
        updated_at: true,
      },
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.todo_app_collaboration_permissions.count({
      where: {
        ...(body.code !== undefined &&
          body.code !== null && { code: { contains: body.code } }),
        ...(body.isGrantable !== undefined &&
          body.isGrantable !== null && { is_grantable: body.isGrantable }),
        ...(body.description !== undefined &&
          body.description !== null && {
            description: { contains: body.description },
          }),
      },
    }),
  ]);

  const data = rows.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    code: r.code,
    description: r.description ?? null,
    isGrantable: r.is_grantable,
    createdAt: toISOStringSafe(r.created_at),
    updatedAt: toISOStringSafe(r.updated_at),
  }));

  const pages = Math.ceil(total / pageSize);

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Number(pages),
    },
    data,
  } as IPageITodoAppCollaborationPermission.ISummary;
}

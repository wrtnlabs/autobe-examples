import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { IPageITodoAppTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodouser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminTodoUsers(props: {
  admin: AdminPayload;
  body: ITodoAppTodoUser.IRequest;
}): Promise<IPageITodoAppTodouser.ISummary> {
  const { admin, body } = props;

  const page = Number(body.page ?? 1);
  const limit = Number(body.pageSize ?? 25);

  if (page < 1) throw new HttpException("Bad Request: page must be >= 1", 400);
  if (limit < 1)
    throw new HttpException("Bad Request: pageSize must be >= 1", 400);
  if (limit > 100)
    throw new HttpException("Bad Request: pageSize must not exceed 100", 400);

  const skip = (page - 1) * limit;

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.todo_app_todouser.findMany({
        where: {
          ...(body.includeDeleted !== true && { deleted_at: null }),
          ...(body.email !== undefined &&
            body.email !== null && { email: { contains: body.email } }),
          ...(body.displayName !== undefined &&
            body.displayName !== null && {
              display_name: { contains: body.displayName },
            }),
          ...(body.status !== undefined &&
            body.status !== null && { status: body.status }),
          ...(body.isVerified !== undefined && {
            is_verified: body.isVerified,
          }),
          ...((body.createdAfter !== undefined && body.createdAfter !== null) ||
          (body.createdBefore !== undefined && body.createdBefore !== null)
            ? {
                created_at: {
                  ...(body.createdAfter !== undefined &&
                    body.createdAfter !== null && { gte: body.createdAfter }),
                  ...(body.createdBefore !== undefined &&
                    body.createdBefore !== null && { lte: body.createdBefore }),
                },
              }
            : {}),
        },
        select: {
          id: true,
          display_name: true,
          is_verified: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
        orderBy:
          body.sortBy === "updatedAt"
            ? { updated_at: body.order === "asc" ? "asc" : "desc" }
            : { created_at: body.order === "asc" ? "asc" : "desc" },
        skip,
        take: limit,
      }),
      MyGlobal.prisma.todo_app_todouser.count({
        where: {
          ...(body.includeDeleted !== true && { deleted_at: null }),
          ...(body.email !== undefined &&
            body.email !== null && { email: { contains: body.email } }),
          ...(body.displayName !== undefined &&
            body.displayName !== null && {
              display_name: { contains: body.displayName },
            }),
          ...(body.status !== undefined &&
            body.status !== null && { status: body.status }),
          ...(body.isVerified !== undefined && {
            is_verified: body.isVerified,
          }),
          ...((body.createdAfter !== undefined && body.createdAfter !== null) ||
          (body.createdBefore !== undefined && body.createdBefore !== null)
            ? {
                created_at: {
                  ...(body.createdAfter !== undefined &&
                    body.createdAfter !== null && { gte: body.createdAfter }),
                  ...(body.createdBefore !== undefined &&
                    body.createdBefore !== null && { lte: body.createdBefore }),
                },
              }
            : {}),
        },
      }),
    ]);

    const data = rows.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      displayName: r.display_name === null ? null : r.display_name,
      isVerified: r.is_verified,
      status: r.status ?? undefined,
      createdAt: toISOStringSafe(r.created_at),
      updatedAt: toISOStringSafe(r.updated_at),
    }));

    // Audit the access
    const now = toISOStringSafe(new Date());
    await MyGlobal.prisma.todo_app_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_admin_id: admin.id,
        todo_app_admin_session_id: admin.session_id,
        event_type: "todo_user.list",
        details: JSON.stringify({
          page,
          limit,
          filters: {
            email: body.email ?? null,
            displayName: body.displayName ?? null,
            status: body.status ?? null,
            isVerified: body.isVerified ?? null,
          },
        }),
        created_at: now,
        updated_at: now,
      },
    });

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: total,
        pages: Math.ceil(total / limit),
      },
      data,
    };
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}

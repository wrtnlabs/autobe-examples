import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminUsers(props: {
  admin: AdminPayload;
  body: ITodoAppUser.IRequest;
}): Promise<IPageITodoAppUser.ISummary> {
  const { admin, body } = props;

  const rawPage = (body.page ?? 1) as number & tags.Type<"int32"> as number;
  const rawPageSize = (body.pageSize ?? 20) as number &
    tags.Type<"int32"> as number;
  const page = Number(rawPage >= 1 ? rawPage : 1);
  const pageSize = Number(rawPageSize <= 0 ? 20 : Math.min(rawPageSize, 100));

  const allowedStatuses = ["active", "suspended"];
  const allowedSortBy = ["created_at", "last_active_at"] as const;

  if (page < 1) throw new HttpException("page must be >= 1", 400);
  if (pageSize < 1 || pageSize > 100)
    throw new HttpException("pageSize must be between 1 and 100", 400);
  if (
    body.account_status !== undefined &&
    body.account_status !== null &&
    !allowedStatuses.includes(body.account_status)
  ) {
    throw new HttpException("Invalid account_status", 400);
  }
  if (
    body.emailLike !== undefined &&
    body.emailLike !== null &&
    body.emailLike.length > 256
  ) {
    throw new HttpException("emailLike too long", 400);
  }

  const sortBy = (
    body.sortBy && allowedSortBy.includes(body.sortBy as any)
      ? body.sortBy
      : "created_at"
  ) as (typeof allowedSortBy)[number];
  const order = body.order === "asc" ? "asc" : "desc";

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.todo_app_user.findMany({
        where: {
          ...(body.account_status !== undefined &&
            body.account_status !== null && {
              account_status: body.account_status,
            }),
          ...(body.emailLike !== undefined &&
            body.emailLike !== null && { email: { contains: body.emailLike } }),
        },
        select: {
          id: true,
          email: true,
          display_name: true,
          account_status: true,
          created_at: true,
          last_active_at: true,
        },
        orderBy:
          sortBy === "created_at"
            ? { created_at: order }
            : { last_active_at: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      MyGlobal.prisma.todo_app_user.count({
        where: {
          ...(body.account_status !== undefined &&
            body.account_status !== null && {
              account_status: body.account_status,
            }),
          ...(body.emailLike !== undefined &&
            body.emailLike !== null && { email: { contains: body.emailLike } }),
        },
      }),
    ]);

    const now = toISOStringSafe(new Date());
    const filtersSummary = [] as string[];
    if (body.account_status !== undefined && body.account_status !== null)
      filtersSummary.push(`account_status=${body.account_status}`);
    if (body.emailLike !== undefined && body.emailLike !== null)
      filtersSummary.push(`emailLike_provided=true`);

    await MyGlobal.prisma.todo_app_audit_records.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        admin_id: admin.id,
        user_id: null,
        actor_role: "admin",
        action_type: "search_users",
        target_resource: "user",
        target_id: null,
        reason: filtersSummary.length > 0 ? filtersSummary.join(",") : null,
        created_at: now,
      },
    });

    const data = rows.map((u) => ({
      id: u.id as string & tags.Format<"uuid">,
      email: u.email as string & tags.Format<"email">,
      display_name: u.display_name ?? null,
      account_status: u.account_status,
      created_at: toISOStringSafe(u.created_at),
      last_active_at: u.last_active_at
        ? toISOStringSafe(u.last_active_at)
        : null,
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
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}

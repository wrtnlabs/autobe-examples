import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { IPageITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminTodoListAdmins(props: {
  admin: AdminPayload;
  body: ITodoListAdmin.IRequest;
}): Promise<IPageITodoListAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereConditionBase = {
    ...(props.body.search_email
      ? { email: { contains: props.body.search_email } }
      : {}),
    ...(props.body.created_at_from || props.body.created_at_to
      ? {
          created_at: {
            ...(props.body.created_at_from
              ? { gte: props.body.created_at_from }
              : {}),
            ...(props.body.created_at_to
              ? { lte: props.body.created_at_to }
              : {}),
          },
        }
      : {}),
    ...(props.body.updated_at_from || props.body.updated_at_to
      ? {
          updated_at: {
            ...(props.body.updated_at_from
              ? { gte: props.body.updated_at_from }
              : {}),
            ...(props.body.updated_at_to
              ? { lte: props.body.updated_at_to }
              : {}),
          },
        }
      : {}),
  };

  const whereCondition = {
    ...whereConditionBase,
    ...(props.body.status
      ? props.body.status === "active"
        ? { deleted_at: null }
        : { deleted_at: { not: null } }
      : { deleted_at: null }),
  };

  const [admins, total] = await Promise.all([
    MyGlobal.prisma.todo_list_admins.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.todo_list_admins.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: admins.map((admin) => ({
      id: admin.id,
      email: admin.email,
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
      deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    })),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}

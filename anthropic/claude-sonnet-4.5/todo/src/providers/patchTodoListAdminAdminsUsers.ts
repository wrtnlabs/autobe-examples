import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminAdminsUsers(props: {
  admin: AdminPayload;
  body: ITodoListUser.IRequest;
}): Promise<IPageITodoListUser.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = body.sort ?? "created_at_desc";

  const whereCondition = {
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null && {
        email: { contains: body.search },
      }),
    ...((body.created_after !== undefined && body.created_after !== null) ||
    (body.created_before !== undefined && body.created_before !== null)
      ? {
          created_at: {
            ...(body.created_after !== undefined &&
              body.created_after !== null && {
                gte: body.created_after,
              }),
            ...(body.created_before !== undefined &&
              body.created_before !== null && {
                lte: body.created_before,
              }),
          },
        }
      : {}),
  };

  const [users, totalCount] = await Promise.all([
    MyGlobal.prisma.todo_list_users.findMany({
      where: whereCondition,
      orderBy:
        sort === "created_at_asc"
          ? { created_at: "asc" }
          : sort === "created_at_desc"
            ? { created_at: "desc" }
            : sort === "email_asc"
              ? { email: "asc" }
              : { email: "desc" },
      skip: skip,
      take: limit,
      select: { id: true, email: true },
    }),
    MyGlobal.prisma.todo_list_users.count({ where: whereCondition }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: totalCount,
      pages: totalPages,
    },
    data: users.map((user) => ({
      id: user.id as string & tags.Format<"uuid">,
      email: user.email as string & tags.Format<"email">,
    })),
  };
}

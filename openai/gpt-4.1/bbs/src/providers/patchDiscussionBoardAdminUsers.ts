import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminUsers(props: {
  admin: AdminPayload;
  body: IDiscussionBoardUser.IRequest;
}): Promise<IPageIDiscussionBoardUser.ISummary> {
  const {
    email,
    is_active,
    is_blocked,
    is_email_verified,
    created_from,
    created_to,
    deleted,
    page,
    limit,
    order_by,
    order_dir,
  } = props.body ?? {};
  const filterWhere = {
    ...(email && { email: { contains: email } }),
    ...(typeof is_active === "boolean" && { is_active }),
    ...(typeof is_blocked === "boolean" && { is_blocked }),
    ...(typeof is_email_verified === "boolean" && { is_email_verified }),
    ...(created_from && { created_at: { gte: created_from } }),
    ...(created_to && {
      created_at: {
        ...(created_from ? { gte: created_from } : {}),
        lte: created_to,
      },
    }),
    ...(typeof deleted === "boolean"
      ? deleted
        ? { deleted_at: { not: null } }
        : { deleted_at: null }
      : {}),
  };
  let sortField: "created_at" | "email" =
    order_by === "email" ? "email" : "created_at";
  let sortDir: "asc" | "desc" = order_dir === "asc" ? "asc" : "desc";
  const curPage = typeof page === "number" ? (page > 0 ? page : 1) : 1;
  const pgLimit = typeof limit === "number" ? (limit > 0 ? limit : 100) : 100;
  const skip = (curPage - 1) * pgLimit;
  const [users, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_users.findMany({
      where: filterWhere,
      orderBy: { [sortField]: sortDir },
      skip,
      take: pgLimit,
    }),
    MyGlobal.prisma.discussion_board_users.count({ where: filterWhere }),
  ]);
  const data = users.map((user) => ({
    id: user.id,
    email: user.email,
    is_email_verified: user.is_email_verified,
    is_active: user.is_active,
    is_blocked: user.is_blocked,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
  }));
  const result = {
    pagination: {
      current: curPage satisfies number as number,
      limit: pgLimit satisfies number as number,
      records: total,
      pages: Math.ceil(total / pgLimit),
    },
    data,
  };
  return result;
}

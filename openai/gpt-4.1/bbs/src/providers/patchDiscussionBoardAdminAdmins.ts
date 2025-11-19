import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminAdmins(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdmin.IRequest;
}): Promise<IPageIDiscussionBoardAdmin.ISummary> {
  const {
    email,
    created_after,
    created_before,
    updated_after,
    updated_before,
    deleted,
    page = 1,
    limit = 100,
    sort_by = "created_at",
    sort_dir = "desc",
  } = props.body ?? {};
  const safe_limit = Math.max(1, Math.min(100, Number(limit)));
  const safe_page = Math.max(1, Number(page));
  const skip = (safe_page - 1) * safe_limit;
  const take = safe_limit;
  const where: Record<string, unknown> = {};
  if (email !== undefined) {
    where.email = { contains: email };
  }
  if (created_after !== undefined || created_before !== undefined) {
    where.created_at = {};
    if (created_after !== undefined)
      (where.created_at as any).gte = created_after;
    if (created_before !== undefined)
      (where.created_at as any).lte = created_before;
  }
  if (updated_after !== undefined || updated_before !== undefined) {
    where.updated_at = {};
    if (updated_after !== undefined)
      (where.updated_at as any).gte = updated_after;
    if (updated_before !== undefined)
      (where.updated_at as any).lte = updated_before;
  }
  if (deleted === true) {
    where.deleted_at = { not: null };
  } else if (deleted === false) {
    where.deleted_at = null;
  }
  const allowedSortBy = ["email", "created_at", "updated_at"];
  const allowedSortDir = ["asc", "desc"];
  const orderField = allowedSortBy.includes(sort_by ?? "")
    ? sort_by
    : "created_at";
  const orderDir = allowedSortDir.includes(sort_dir ?? "") ? sort_dir : "desc";
  const orderBy = { [orderField]: orderDir };
  const [admins, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_admins.findMany({
      where,
      skip,
      take,
      orderBy,
    }),
    MyGlobal.prisma.discussion_board_admins.count({ where }),
  ]);
  return {
    pagination: {
      current: safe_page,
      limit: safe_limit,
      records: total,
      pages: Math.ceil(total / safe_limit),
    },
    data: admins.map((a) => ({
      id: a.id,
      email: a.email,
      created_at: toISOStringSafe(a.created_at),
      updated_at: toISOStringSafe(a.updated_at),
      deleted_at: a.deleted_at === null ? null : toISOStringSafe(a.deleted_at),
    })),
  };
}

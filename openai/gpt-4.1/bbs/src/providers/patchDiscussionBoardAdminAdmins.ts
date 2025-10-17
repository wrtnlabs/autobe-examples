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
  const { admin, body } = props;
  // 1. Authorization: forced by presence of admin param

  // 2. Pagination params (default page 1, limit 20)
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  // 3. Sorting: allowed fields only
  const allowedSortFields = [
    "email",
    "username",
    "registration_completed_at",
    "created_at",
  ] as const;
  const sortField =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortOrder =
    body.sort_order === "asc" || body.sort_order === "desc"
      ? body.sort_order
      : "desc";

  // 4. Build Prisma where clause
  const where = {
    deleted_at: null,
    ...(body.email !== undefined &&
      body.email !== null && {
        email: { contains: body.email },
      }),
    ...(body.username !== undefined &&
      body.username !== null && {
        username: { contains: body.username },
      }),
    ...(body.email_verified !== undefined &&
      body.email_verified !== null && {
        email_verified: body.email_verified,
      }),
    ...((body.registration_completed_at_start !== undefined &&
      body.registration_completed_at_start !== null) ||
    (body.registration_completed_at_end !== undefined &&
      body.registration_completed_at_end !== null)
      ? {
          registration_completed_at: {
            ...(body.registration_completed_at_start !== undefined &&
              body.registration_completed_at_start !== null && {
                gte: body.registration_completed_at_start,
              }),
            ...(body.registration_completed_at_end !== undefined &&
              body.registration_completed_at_end !== null && {
                lte: body.registration_completed_at_end,
              }),
          },
        }
      : {}),
  };

  // 5. Query Prisma
  const [records, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_admins.findMany({
      where,
      orderBy: {
        [sortField]: sortOrder,
      },
      select: {
        id: true,
        email: true,
        username: true,
        email_verified: true,
        registration_completed_at: true,
      },
      skip,
      take: Number(limit),
    }),
    MyGlobal.prisma.discussion_board_admins.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: records.map((record) => ({
      id: record.id,
      email: record.email,
      username: record.username,
      email_verified: record.email_verified,
      registration_completed_at: toISOStringSafe(
        record.registration_completed_at,
      ),
    })),
  };
}

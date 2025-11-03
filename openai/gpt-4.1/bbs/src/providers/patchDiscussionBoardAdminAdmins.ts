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
  const body = props.body;
  const page = body.page ?? 1;
  let limit = body.limit ?? 20;
  if (limit > 100) limit = 100;
  const skip = (page - 1) * limit;

  const where = {
    ...(body.email !== undefined && { email: body.email }),
    ...(body.is_locked !== undefined && { is_locked: body.is_locked }),
    ...(body.deleted_at !== undefined
      ? body.deleted_at === null
        ? { deleted_at: null }
        : { deleted_at: body.deleted_at }
      : {}),
    ...(body.display_name !== undefined &&
      body.display_name !== null &&
      body.display_name !== "" && {
        display_name: { contains: body.display_name },
      }),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search !== "" && {
        OR: [
          { email: { contains: body.search } },
          { display_name: { contains: body.search } },
        ],
      }),
    ...(body.created_at_start !== undefined || body.created_at_end !== undefined
      ? {
          created_at: {
            ...(body.created_at_start !== undefined &&
              body.created_at_start !== null && { gte: body.created_at_start }),
            ...(body.created_at_end !== undefined &&
              body.created_at_end !== null && { lte: body.created_at_end }),
          },
        }
      : {}),
    ...(body.updated_at_start !== undefined || body.updated_at_end !== undefined
      ? {
          updated_at: {
            ...(body.updated_at_start !== undefined &&
              body.updated_at_start !== null && { gte: body.updated_at_start }),
            ...(body.updated_at_end !== undefined &&
              body.updated_at_end !== null && { lte: body.updated_at_end }),
          },
        }
      : {}),
  };

  const allowedSortFields = [
    "created_at",
    "email",
    "display_name",
    "is_locked",
    "deleted_at",
  ];
  const sortBy =
    body.sort_by !== undefined && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortOrder =
    body.sort_order === "asc" || body.sort_order === "desc"
      ? body.sort_order
      : "desc";

  const [admins, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_admins.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        display_name: true,
        avatar_url: true,
        is_locked: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
      },
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
    data: admins.map((admin) => ({
      id: admin.id,
      email: admin.email,
      display_name: admin.display_name,
      avatar_url:
        admin.avatar_url !== null && admin.avatar_url !== undefined
          ? admin.avatar_url
          : undefined,
      is_locked: admin.is_locked,
      deleted_at:
        admin.deleted_at !== null && admin.deleted_at !== undefined
          ? toISOStringSafe(admin.deleted_at)
          : null,
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
    })),
  };
}

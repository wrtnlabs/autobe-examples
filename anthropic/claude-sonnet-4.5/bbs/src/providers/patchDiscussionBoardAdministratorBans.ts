import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import { IPageIDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBan";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchDiscussionBoardAdministratorBans(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardBan.IRequest;
}): Promise<IPageIDiscussionBoardBan.ISummary> {
  const { administrator, body } = props;

  // Extract pagination parameters with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 25;
  const skip = (page - 1) * limit;

  // Build orderBy clause
  const sortField = body.sort ?? "created_at";
  const sortOrder = body.order ?? "desc";

  // Build reusable where clause
  const whereClause = {
    ...(body.member_id !== undefined &&
      body.member_id !== null && {
        member_id: body.member_id,
      }),
    ...(body.administrator_id !== undefined &&
      body.administrator_id !== null && {
        administrator_id: body.administrator_id,
      }),
    ...(body.is_appealable !== undefined && {
      is_appealable: body.is_appealable,
    }),
    ...(body.is_reversed !== undefined && {
      is_reversed: body.is_reversed,
    }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && {
                gte: body.created_from,
              }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && {
                lte: body.created_to,
              }),
          },
        }
      : {}),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.length > 0 && {
        OR: [
          {
            ban_reason: {
              contains: body.search,
            },
          },
          {
            violation_summary: {
              contains: body.search,
            },
          },
        ],
      }),
  };

  // Execute parallel queries for data and count
  const [bans, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_bans.findMany({
      where: whereClause,
      include: {
        member: {
          select: {
            username: true,
          },
        },
      },
      orderBy:
        sortField === "member_username"
          ? { member: { username: sortOrder === "asc" ? "asc" : "desc" } }
          : sortField === "is_reversed"
            ? { is_reversed: sortOrder === "asc" ? "asc" : "desc" }
            : { created_at: sortOrder === "asc" ? "asc" : "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_bans.count({
      where: whereClause,
    }),
  ]);

  // Transform to ISummary format with proper type branding
  const data = bans.map(
    (ban) =>
      ({
        id: ban.id as string & tags.Format<"uuid">,
        member_id: ban.member_id as string & tags.Format<"uuid">,
        member_username: ban.member.username,
        administrator_id: ban.administrator_id as string & tags.Format<"uuid">,
        ban_reason: ban.ban_reason,
        is_appealable: ban.is_appealable,
        is_reversed: ban.is_reversed,
        created_at: toISOStringSafe(ban.created_at),
      }) satisfies IDiscussionBoardBan.ISummary,
  );

  // Build pagination response
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}

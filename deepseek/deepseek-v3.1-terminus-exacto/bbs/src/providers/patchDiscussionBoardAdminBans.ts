import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminBans(props: {
  admin: AdminPayload;
  body: IDiscussionBoardUserBan.IRequest;
}): Promise<IPageIDiscussionBoardUserBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    AND: [
      ...(props.body.ban_status ? [{ ban_status: props.body.ban_status }] : []),
      ...(props.body.ban_duration_type
        ? [{ ban_duration_type: props.body.ban_duration_type }]
        : []),
      ...(props.body.appeal_status
        ? [{ appeal_status: props.body.appeal_status }]
        : []),
      ...(props.body.banning_administrator_id
        ? [{ banning_administrator_id: props.body.banning_administrator_id }]
        : []),
      ...(props.body.ban_started_at_from || props.body.ban_started_at_to
        ? [
            {
              ban_started_at: {
                ...(props.body.ban_started_at_from
                  ? { gte: new Date(props.body.ban_started_at_from) }
                  : {}),
                ...(props.body.ban_started_at_to
                  ? { lte: new Date(props.body.ban_started_at_to) }
                  : {}),
              },
            },
          ]
        : []),
      ...(props.body.ban_ends_at_from || props.body.ban_ends_at_to
        ? [
            {
              ban_ends_at: {
                ...(props.body.ban_ends_at_from
                  ? { gte: new Date(props.body.ban_ends_at_from) }
                  : {}),
                ...(props.body.ban_ends_at_to
                  ? { lte: new Date(props.body.ban_ends_at_to) }
                  : {}),
              },
            },
          ]
        : []),
      ...(props.body.search
        ? [
            {
              OR: [
                { ban_reason: { contains: props.body.search } },
                {
                  banningAdministrator: {
                    display_name: { contains: props.body.search },
                  },
                },
              ],
            },
          ]
        : []),
    ].filter(Boolean),
  } satisfies Prisma.discussion_board_user_bansWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_user_bans.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        ban_reason: true,
        ban_duration_type: true,
        ban_status: true,
        appeal_status: true,
        ban_started_at: true,
        ban_ends_at: true,
        bannedUser: {
          select: {
            id: true,
            display_name: true,
            bio: true,
            created_at: true,
            updated_at: true,
          },
        },
        banningAdministrator: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.discussion_board_user_bans.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((record) => ({
      id: record.id,
      ban_reason: record.ban_reason,
      ban_duration_type: record.ban_duration_type,
      ban_status: record.ban_status,
      appeal_status: record.appeal_status,
      ban_started_at: toISOStringSafe(record.ban_started_at),
      ban_ends_at: record.ban_ends_at
        ? toISOStringSafe(record.ban_ends_at)
        : null,
      bannedUser: {
        id: record.bannedUser.id,
        display_name: record.bannedUser.display_name,
        bio: record.bannedUser.bio,
        created_at: toISOStringSafe(record.bannedUser.created_at),
        updated_at: toISOStringSafe(record.bannedUser.updated_at),
      },
      banningAdministrator: {
        id: record.banningAdministrator.id,
        email: record.banningAdministrator.email,
        display_name: record.banningAdministrator.display_name,
        created_at: toISOStringSafe(record.banningAdministrator.created_at),
      },
    })),
  };
}

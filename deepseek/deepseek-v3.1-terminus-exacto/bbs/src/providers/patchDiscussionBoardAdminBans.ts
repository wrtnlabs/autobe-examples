import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanRecord";
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
  body: IDiscussionBoardBanRecord.IRequest;
}): Promise<IPageIDiscussionBoardBanRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with all supported filters
  const whereInput: Prisma.discussion_board_user_bansWhereInput = {
    AND: [
      ...(props.body.banStatus !== undefined && props.body.banStatus !== null
        ? [{ ban_status: props.body.banStatus }]
        : []),
      ...(props.body.appealStatus !== undefined &&
      props.body.appealStatus !== null
        ? [{ appeal_status: props.body.appealStatus }]
        : []),
      ...(props.body.bannedUserId !== undefined &&
      props.body.bannedUserId !== null
        ? [{ banned_user_id: props.body.bannedUserId }]
        : []),
      ...(props.body.banningAdministratorId !== undefined &&
      props.body.banningAdministratorId !== null
        ? [{ banning_administrator_id: props.body.banningAdministratorId }]
        : []),
      ...(props.body.banStartedAtFrom !== undefined &&
      props.body.banStartedAtFrom !== null
        ? [{ ban_started_at: { gte: props.body.banStartedAtFrom } }]
        : []),
      ...(props.body.banStartedAtTo !== undefined &&
      props.body.banStartedAtTo !== null
        ? [{ ban_started_at: { lte: props.body.banStartedAtTo } }]
        : []),
      ...(props.body.banEndsAtFrom !== undefined &&
      props.body.banEndsAtFrom !== null
        ? [{ ban_ends_at: { gte: props.body.banEndsAtFrom } }]
        : []),
      ...(props.body.banEndsAtTo !== undefined &&
      props.body.banEndsAtTo !== null
        ? [{ ban_ends_at: { lte: props.body.banEndsAtTo } }]
        : []),
      ...(props.body.search !== undefined &&
      props.body.search !== null &&
      props.body.search.trim() !== ""
        ? [
            {
              OR: [
                {
                  ban_reason: {
                    contains: props.body.search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  bannedUser: {
                    display_name: {
                      contains: props.body.search,
                      mode: "insensitive" as const,
                    },
                  },
                },
              ],
            },
          ]
        : []),
    ].filter(
      (item): item is NonNullable<typeof item> =>
        typeof item === "object" && item !== null,
    ),
  } satisfies Prisma.discussion_board_user_bansWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_user_bans.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { ban_started_at: "desc" },
      include: {
        bannedUser: {
          select: {
            id: true,
            display_name: true,
            bio: true,
            created_at: true,
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
    MyGlobal.prisma.discussion_board_user_bans.count({ where: whereInput }),
  ]);
  const banRecords: IDiscussionBoardBanRecord.ISummary[] = data.map(
    (record) => ({
      id: record.id,
      banReason: record.ban_reason,
      banDurationType: record.ban_duration_type,
      banDurationDays: record.ban_duration_days ?? null,
      banStartedAt: toISOStringSafe(record.ban_started_at) as string &
        tags.Format<"date-time">,
      banEndsAt: record.ban_ends_at
        ? (toISOStringSafe(record.ban_ends_at) as
            | (string & tags.Format<"date-time">)
            | null)
        : null,
      banStatus: record.ban_status,
      appealStatus: record.appeal_status,
      bannedUser: {
        id: record.bannedUser.id,
        display_name: record.bannedUser.display_name,
        bio: record.bannedUser.bio ?? null,
        created_at: toISOStringSafe(record.bannedUser.created_at) as string &
          tags.Format<"date-time">,
      } satisfies IDiscussionBoardUser.ISummary,
      banningAdministrator: {
        id: record.banningAdministrator.id,
        email: record.banningAdministrator.email,
        display_name: record.banningAdministrator.display_name,
        created_at: toISOStringSafe(
          record.banningAdministrator.created_at,
        ) as string & tags.Format<"date-time">,
      } satisfies IDiscussionBoardAdmin.ISummary,
    }),
  );
  return {
    pagination: {
      current: page satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data: banRecords,
  } satisfies IPageIDiscussionBoardBanRecord.ISummary;
}

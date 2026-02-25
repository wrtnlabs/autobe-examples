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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardSuperAdminUserBans(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardBanRecord.IRequest;
}): Promise<IPageIDiscussionBoardBanRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Helper function to convert ISO string to Date for Prisma queries
  const toDateForQuery = (
    isoString: string & tags.Format<"date-time">,
  ): Date => {
    return new Date(isoString);
  };
  // Build comprehensive filtering logic with proper date handling
  const whereConditions = {
    ...(props.body.banStatus !== undefined &&
      props.body.banStatus !== null && {
        ban_status: props.body.banStatus,
      }),
    ...(props.body.appealStatus !== undefined &&
      props.body.appealStatus !== null && {
        appeal_status: props.body.appealStatus,
      }),
    ...(props.body.bannedUserId !== undefined &&
      props.body.bannedUserId !== null && {
        banned_user_id: props.body.bannedUserId,
      }),
    ...(props.body.banningAdministratorId !== undefined &&
      props.body.banningAdministratorId !== null && {
        banning_administrator_id: props.body.banningAdministratorId,
      }),
    ...(props.body.banStartedAtFrom !== undefined &&
      props.body.banStartedAtFrom !== null && {
        ban_started_at: { gte: toDateForQuery(props.body.banStartedAtFrom) },
      }),
    ...(props.body.banStartedAtTo !== undefined &&
      props.body.banStartedAtTo !== null && {
        ban_started_at: { lte: toDateForQuery(props.body.banStartedAtTo) },
      }),
    ...(props.body.banEndsAtFrom !== undefined &&
      props.body.banEndsAtFrom !== null && {
        ban_ends_at: { gte: toDateForQuery(props.body.banEndsAtFrom) },
      }),
    ...(props.body.banEndsAtTo !== undefined &&
      props.body.banEndsAtTo !== null && {
        ban_ends_at: { lte: toDateForQuery(props.body.banEndsAtTo) },
      }),
    ...(props.body.search !== undefined &&
      props.body.search !== null && {
        ban_reason: { contains: props.body.search, mode: "insensitive" },
      }),
  } satisfies Prisma.discussion_board_user_bansWhereInput;
  // Query data with pagination and joins
  const data = await MyGlobal.prisma.discussion_board_user_bans.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    select: {
      id: true,
      ban_reason: true,
      ban_duration_type: true,
      ban_duration_days: true,
      ban_started_at: true,
      ban_ends_at: true,
      ban_status: true,
      appeal_status: true,
      bannedUser: {
        select: {
          id: true,
          display_name: true,
          bio: true,
          created_at: true,
        },
      } satisfies Prisma.discussion_board_usersFindManyArgs,
      banningAdministrator: {
        select: {
          id: true,
          email: true,
          display_name: true,
          created_at: true,
        },
      } satisfies Prisma.discussion_board_adminsFindManyArgs,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_user_bans.count({
    where: whereConditions,
  });
  // Transform data to match DTO structure
  const transformed = data.map((record) => ({
    id: record.id,
    banReason: record.ban_reason,
    banDurationType: record.ban_duration_type,
    banDurationDays: record.ban_duration_days,
    banStartedAt: toISOStringSafe(record.ban_started_at),
    banEndsAt: record.ban_ends_at ? toISOStringSafe(record.ban_ends_at) : null,
    banStatus: record.ban_status,
    appealStatus: record.appeal_status,
    bannedUser: {
      id: record.bannedUser.id,
      display_name: record.bannedUser.display_name,
      bio: record.bannedUser.bio ?? undefined,
      created_at: toISOStringSafe(record.bannedUser.created_at),
    } satisfies IDiscussionBoardUser.ISummary,
    banningAdministrator: {
      id: record.banningAdministrator.id,
      email: record.banningAdministrator.email,
      display_name: record.banningAdministrator.display_name,
      created_at: toISOStringSafe(record.banningAdministrator.created_at),
    } satisfies IDiscussionBoardAdmin.ISummary,
  }));
  return {
    pagination: {
      pagination: {
        current: page satisfies number as number,
        limit: limit satisfies number as number,
        records: total satisfies number as number,
        pages: Math.ceil(total / limit) satisfies number as number,
      } satisfies IPage.IPagination,
      data: [] satisfies IDiscussionBoardAdministratorDistributionStatistic.IPagination[],
    } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
    data: transformed,
  } satisfies IPageIDiscussionBoardBanRecord.ISummary;
}

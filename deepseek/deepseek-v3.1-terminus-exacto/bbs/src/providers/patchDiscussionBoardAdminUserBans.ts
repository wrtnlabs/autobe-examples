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
import { DiscussionBoardBanRecordAtSummaryTransformer } from "../transformers/DiscussionBoardBanRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminUserBans(props: {
  admin: AdminPayload;
  body: IDiscussionBoardBanRecord.IRequest;
}): Promise<IPageIDiscussionBoardBanRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    ...(props.body.banStatus !== undefined &&
      props.body.banStatus !== null && { ban_status: props.body.banStatus }),
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
        ban_started_at: { gte: new Date(props.body.banStartedAtFrom) },
      }),
    ...(props.body.banStartedAtTo !== undefined &&
      props.body.banStartedAtTo !== null && {
        ban_started_at: { lte: new Date(props.body.banStartedAtTo) },
      }),
    ...(props.body.banEndsAtFrom !== undefined &&
      props.body.banEndsAtFrom !== null && {
        ban_ends_at: { gte: new Date(props.body.banEndsAtFrom) },
      }),
    ...(props.body.banEndsAtTo !== undefined &&
      props.body.banEndsAtTo !== null && {
        ban_ends_at: { lte: new Date(props.body.banEndsAtTo) },
      }),
    ...(props.body.search !== undefined &&
      props.body.search !== null && {
        ban_reason: { contains: props.body.search },
      }),
  } satisfies Prisma.discussion_board_user_bansWhereInput;
  const data = await MyGlobal.prisma.discussion_board_user_bans.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...DiscussionBoardBanRecordAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_user_bans.count({
    where,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardBanRecordAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      pagination: {
        current: page satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: limit satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
        records: total satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
        pages: Math.ceil(total / limit) satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
      } satisfies IPage.IPagination,
    } satisfies IPageIDiscussionBoardBanRecord.ISummary["pagination"],
  } satisfies IPageIDiscussionBoardBanRecord.ISummary;
}

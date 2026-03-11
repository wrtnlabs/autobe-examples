import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
import { DiscussionBoardUserBanAtSummaryTransformer } from "../transformers/DiscussionBoardUserBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminBansDashboard(props: {
  admin: AdminPayload;
  body: IDiscussionBoardUserBan.IRequest;
}): Promise<IPageIDiscussionBoardUserBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereConditions = {
    deleted_at: null,
    ...(props.body.member_id !== undefined &&
      props.body.member_id !== null && {
        member_id: props.body.member_id,
      }),
    ...(props.body.admin_id !== undefined &&
      props.body.admin_id !== null && {
        admin_id: props.body.admin_id,
      }),
    ...(props.body.status !== undefined &&
      props.body.status !== null && {
        status: props.body.status,
      }),
    ...(props.body.reason !== undefined &&
      props.body.reason !== null && {
        reason: { contains: props.body.reason, mode: "insensitive" as const },
      }),
    ...(props.body.banned_at_from !== undefined &&
      props.body.banned_at_from !== null && {
        banned_at: { gte: new Date(props.body.banned_at_from) },
      }),
    ...(props.body.banned_at_to !== undefined &&
      props.body.banned_at_to !== null && {
        banned_at: {
          ...(props.body.banned_at_to
            ? { lte: new Date(props.body.banned_at_to) }
            : {}),
        },
      }),
    ...(props.body.expires_at_from !== undefined &&
      props.body.expires_at_from !== null && {
        expires_at: { gte: new Date(props.body.expires_at_from) },
      }),
    ...(props.body.expires_at_to !== undefined &&
      props.body.expires_at_to !== null && {
        expires_at: {
          ...(props.body.expires_at_to
            ? { lte: new Date(props.body.expires_at_to) }
            : {}),
        },
      }),
    ...(props.body.unbanned_at_from !== undefined &&
      props.body.unbanned_at_from !== null && {
        unbanned_at: { gte: new Date(props.body.unbanned_at_from) },
      }),
    ...(props.body.unbanned_at_to !== undefined &&
      props.body.unbanned_at_to !== null && {
        unbanned_at: {
          ...(props.body.unbanned_at_to
            ? { lte: new Date(props.body.unbanned_at_to) }
            : {}),
        },
      }),
  } satisfies Prisma.discussion_board_user_bansWhereInput;
  // Execute queries in parallel
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_user_bans.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { banned_at: "desc" as const },
      ...DiscussionBoardUserBanAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_user_bans.count({
      where: whereConditions,
    }),
  ]);
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardUserBanAtSummaryTransformer.transform,
  );
  // Return paginated result
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}

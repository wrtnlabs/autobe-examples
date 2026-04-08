import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneReport";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditCloneReportAtSummaryTransformer } from "../transformers/RedditCloneReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneModeratorReports(props: {
  moderator: ModeratorPayload;
  body: IRedditCloneReport.IRequest;
}): Promise<IPageIRedditCloneReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  const moderatorAccount =
    await MyGlobal.prisma.reddit_clone_moderators.findUniqueOrThrow({
      where: {
        id: props.moderator.id,
        deleted_at: null,
      },
      select: {
        reddit_clone_user_profile_id: true,
      },
    });
  const moderatorCommunities =
    await MyGlobal.prisma.reddit_clone_community_moderators.findMany({
      where: {
        reddit_clone_user_profile_id:
          moderatorAccount.reddit_clone_user_profile_id,
        deleted_at: null,
      },
      select: {
        reddit_clone_community_id: true,
      },
    });
  const communityIds = moderatorCommunities.map(
    (m) => m.reddit_clone_community_id,
  );
  if (communityIds.length === 0) {
    return {
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  const whereInput = {
    deleted_at: null,
    OR: [
      {
        reportedPost: {
          reddit_clone_community_id: { in: communityIds },
          deleted_at: null,
        },
      },
      {
        reportedComment: {
          post: {
            reddit_clone_community_id: { in: communityIds },
          },
          deleted_at: null,
        },
      },
    ],
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.report_type && { report_type: props.body.report_type }),
  } satisfies Prisma.reddit_clone_reportsWhereInput;
  const orderByInput = {
    [sortField]: sortOrder,
  } satisfies Prisma.reddit_clone_reportsOrderByWithRelationInput;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.reddit_clone_reports.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCloneReportAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_clone_reports.count({
      where: whereInput,
    }),
  ]);
  const data = await ArrayUtil.asyncMap(
    records,
    RedditCloneReportAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformReportAtSummaryTransformer } from "../transformers/RedditPlatformReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberCommunitiesCommunityIdModerationQueue(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunityModerator.IRequest;
}): Promise<IPageIRedditPlatformReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const skip = (page - 1) * limit;
  const moderator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.member.id,
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const whereInput: Prisma.reddit_platform_reportsWhereInput = {
    community_id: props.communityId,
    status: "PENDING" as "PENDING",
    deleted_at: null,
    ...(props.body.reporter_id !== undefined && {
      reporter_id: props.body.reporter_id,
    }),
    ...(props.body.reported_content_type !== undefined && {
      reported_content_type: props.body.reported_content_type satisfies
        | "POST"
        | "COMMENT",
    }),
    ...(props.body.created_at_min !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_min),
      } satisfies Prisma.DateTimeFilter,
    }),
    ...(props.body.created_at_max !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_max),
      } satisfies Prisma.DateTimeFilter,
    }),
  } satisfies Prisma.reddit_platform_reportsWhereInput;
  const orderByInput: Prisma.reddit_platform_reportsOrderByWithRelationInput[] =
    props.body.sort === "reason_length"
      ? [
          {
            reason: "asc" satisfies Prisma.SortOrder,
          },
        ]
      : props.body.sort === "reporter_history"
        ? [{ created_at: "desc" satisfies Prisma.SortOrder }]
        : [{ created_at: "desc" satisfies Prisma.SortOrder }];
  const data = await MyGlobal.prisma.reddit_platform_reports.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditPlatformReportAtSummaryTransformer.select(),
  } satisfies Prisma.reddit_platform_reportsFindManyArgs);
  const total = await MyGlobal.prisma.reddit_platform_reports.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformReportAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
  };
}

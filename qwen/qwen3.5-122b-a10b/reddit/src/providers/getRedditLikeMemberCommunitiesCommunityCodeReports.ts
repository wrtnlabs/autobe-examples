import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeReportAtSummaryTransformer } from "../transformers/RedditLikeReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeMemberCommunitiesCommunityCodeReports(props: {
  member: MemberPayload;
  communityCode: string;
}): Promise<IPageIRedditLikeReport.ISummary> {
  // Find community by code (name)
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      name: props.communityCode,
      deleted_at: null,
    },
    select: {
      id: true,
      owner_id: true,
    },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Check if member is owner or moderator
  const isOwner = community.owner_id === props.member.id;
  if (!isOwner) {
    const isModerator =
      await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
        where: {
          reddit_like_community_id: community.id,
          reddit_like_member_id: props.member.id,
          deleted_at: null,
        },
      });
    if (!isModerator) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Query reports for this community (both post and comment reports)
  const postReportWhere = {
    deleted_at: null,
    actor_type: "post",
    postTarget: {
      post: {
        reddit_like_community_id: community.id,
        deleted_at: null,
      },
    },
  } satisfies Prisma.reddit_like_reportsWhereInput;
  const commentReportWhere = {
    deleted_at: null,
    actor_type: "comment",
    commentTarget: {
      comment: {
        post: {
          reddit_like_community_id: community.id,
          deleted_at: null,
        },
      },
    },
  } satisfies Prisma.reddit_like_reportsWhereInput;
  // Get pagination parameters (defaults)
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Query reports
  const records = await MyGlobal.prisma.reddit_like_reports.findMany({
    where: {
      OR: [postReportWhere, commentReportWhere],
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditLikeReportAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.reddit_like_reports.count({
    where: {
      OR: [postReportWhere, commentReportWhere],
    },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditLikeReportAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditLikeReport.ISummary;
}

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { IRedditLikeReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditLikeReportTransformer } from "../transformers/RedditLikeReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeOwnerCommunitiesCommunityIdReportsPending(props: {
  owner: OwnerPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IPageIRedditLikeReport> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Verify owner authorization - check if owner owns this community
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      id: props.communityId,
      owner_id: props.owner.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (community === null) {
    throw new HttpException(
      "Community not found or you don't have access",
      403,
    );
  }
  // Query pending reports for the community
  const reports = await MyGlobal.prisma.reddit_like_reports.findMany({
    where: {
      community_id: props.communityId,
      status: "pending",
    },
    orderBy: {
      created_at: "desc",
    },
    skip,
    take: limit,
    select: RedditLikeReportTransformer.select().select,
  });
  // Count total pending reports
  const total = await MyGlobal.prisma.reddit_like_reports.count({
    where: {
      community_id: props.communityId,
      status: "pending",
    },
  });
  // Transform reports to DTO
  const data = await ArrayUtil.asyncMap(
    reports,
    RedditLikeReportTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}

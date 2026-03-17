import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeReportAtSummaryTransformer } from "../transformers/RedditLikeReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeModeratorCommunitiesCommunityIdReportsPending(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IPageIRedditLikeReport.ISummary> {
  // Verify moderator has access to this community
  const moderatorRole = await MyGlobal.prisma.reddit_like_moderators.findFirst({
    where: {
      member_id: props.moderator.id,
      community_id: props.communityId,
      deleted_at: null,
    },
  });
  if (moderatorRole === null) {
    throw new HttpException(
      "Forbidden: Not a moderator of this community",
      403,
    );
  }
  // Default pagination
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Query pending reports with related data
  const reports = await MyGlobal.prisma.reddit_like_reports.findMany({
    where: {
      community_id: props.communityId,
      status: "pending",
    },
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    ...RedditLikeReportAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_like_reports.count({
    where: {
      community_id: props.communityId,
      status: "pending",
    },
  });
  // Transform reports to DTO
  const data = await ArrayUtil.asyncMap(
    reports,
    RedditLikeReportAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}

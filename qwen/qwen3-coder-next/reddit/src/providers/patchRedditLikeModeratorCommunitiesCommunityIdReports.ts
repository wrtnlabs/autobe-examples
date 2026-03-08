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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeReportAtSummaryTransformer } from "../transformers/RedditLikeReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeModeratorCommunitiesCommunityIdReports(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikeReport.IRequest;
}): Promise<IPageIRedditLikeReport.ISummary> {
  // Check if moderator has access to this community
  const moderatorRole =
    await MyGlobal.prisma.reddit_like_moderator_roles.findFirst({
      where: {
        user_id: props.moderator.id,
        community_id: props.communityId,
      },
    });
  if (!moderatorRole) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where condition
  const where: Prisma.reddit_like_reportsWhereInput = {
    status: "pending",
    deleted_at: null,
    OR: [
      {
        reportedPost: {
          community_id: props.communityId,
        },
      },
      {
        reportedComment: {
          post: {
            community_id: props.communityId,
          },
        },
      },
    ],
  };
  // Parse pagination parameters
  const page = Math.max(1, Math.floor(props.body.page || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(props.body.limit || 20)));
  const skip = (page - 1) * limit;
  // Parse sort parameters with proper SortOrder
  const orderBy: Prisma.reddit_like_reportsOrderByWithRelationInput =
    props.body.sort === "created_at_desc"
      ? { created_at: "desc" as const }
      : { created_at: "asc" as const };
  // Query reports with pagination
  const [reports, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_reports.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...RedditLikeReportAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_like_reports.count({ where }),
  ]);
  // Transform to response format
  const data = await Promise.all(
    reports.map((report) =>
      RedditLikeReportAtSummaryTransformer.transform(report as any),
    ),
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

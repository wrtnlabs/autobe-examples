import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";
import { RedditCommunityCommentReportAtSummaryTransformer } from "../transformers/RedditCommunityCommentReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityCommunityModeratorCommunitiesCommunityIdReports(props: {
  communityModerator: CommunitymoderatorPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IPageIRedditCommunityCommentReport.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.reddit_community_comment_reports.findMany({
    where: {
      comment: {
        comment_id: props.communityId,
      },
      status: "pending",
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditCommunityCommentReportAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_comment_reports.count({
    where: {
      comment: {
        comment_id: props.communityId,
      },
      status: "pending",
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityCommentReportAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}

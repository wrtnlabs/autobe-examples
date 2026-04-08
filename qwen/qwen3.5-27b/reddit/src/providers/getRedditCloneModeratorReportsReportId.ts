import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { RedditCloneReportTransformer } from "../transformers/RedditCloneReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneReport> {
  // Fetch the moderator's user profile ID for authorization check
  const moderatorRecord =
    await MyGlobal.prisma.reddit_clone_moderators.findUniqueOrThrow({
      where: {
        id: props.moderator.id,
      },
      select: {
        reddit_clone_user_profile_id: true,
      },
    });
  // Fetch the report with community information for authorization check
  const report = await MyGlobal.prisma.reddit_clone_reports.findUniqueOrThrow({
    where: {
      id: props.reportId,
    },
    select: {
      id: true,
      report_type: true,
      reportedPost: {
        select: {
          reddit_clone_community_id: true,
        },
      },
      reportedComment: {
        select: {
          post: {
            select: {
              reddit_clone_community_id: true,
            },
          },
        },
      },
    },
  });
  // Determine the community ID from the reported content
  let communityId: string | null = null;
  if (report.report_type === "post" && report.reportedPost) {
    communityId = report.reportedPost.reddit_clone_community_id;
  } else if (report.report_type === "comment" && report.reportedComment) {
    communityId =
      report.reportedComment.post?.reddit_clone_community_id ?? null;
  }
  // Verify moderator has access to the community
  if (communityId) {
    const moderatorAccess =
      await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
        where: {
          reddit_clone_user_profile_id:
            moderatorRecord.reddit_clone_user_profile_id,
          reddit_clone_community_id: communityId,
        },
      });
    if (!moderatorAccess) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Fetch the full report with transformer select
  const record = await MyGlobal.prisma.reddit_clone_reports.findUniqueOrThrow({
    where: {
      id: props.reportId,
    },
    ...RedditCloneReportTransformer.select(),
  });
  return await RedditCloneReportTransformer.transform(record);
}

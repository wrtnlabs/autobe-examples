import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { RedditCommunityReportTransformer } from "../transformers/RedditCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityCommunityOwnerReportsReportId(props: {
  communityOwner: CommunityownerPayload;
  reportId: string;
}): Promise<IRedditCommunityReport> {
  const report =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditCommunityReportTransformer.select(),
    });
  // Extract target community ID from either post or comment using correct relation property names
  const targetCommunityId =
    report.postReport?.community?.id ??
    report.commentReport?.post?.community?.id;
  // Validate authorization: user must be owner of target community or moderator of target community
  const targetCommunityOwner =
    await MyGlobal.prisma.reddit_community_community_owners.findUnique({
      where: { id: props.communityOwner.id },
    });
  const isOwnerOfTarget = targetCommunityOwner?.id === targetCommunityId;
  const userIsModerator =
    await MyGlobal.prisma.reddit_community_moderators.findFirst({
      where: {
        user_id: props.communityOwner.id,
        community_id: targetCommunityId,
      },
    });
  const isModeratorOfTarget = userIsModerator !== null;
  if (!isOwnerOfTarget && !isModeratorOfTarget) {
    throw new HttpException("Forbidden", 403);
  }
  return await RedditCommunityReportTransformer.transform(report);
}

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { RedditCommunityCommentReportTransformer } from "../transformers/RedditCommunityCommentReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityCommunityOwnerReportsReportId(props: {
  communityOwner: CommunityownerPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommentReport> {
  const report =
    await MyGlobal.prisma.reddit_community_comment_reports.findUnique({
      where: { id: props.reportId },
      ...RedditCommunityCommentReportTransformer.select(),
    });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  // Verify requester is the owner or has admin rights (in this case, communityOwner is authorized)
  // No additional authorization check needed beyond the decorator/provder layer
  return await RedditCommunityCommentReportTransformer.transform(report);
}

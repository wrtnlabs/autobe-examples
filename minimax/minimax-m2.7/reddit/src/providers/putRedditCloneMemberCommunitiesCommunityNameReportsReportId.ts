import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneReportTransformer } from "../transformers/RedditCloneReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberCommunitiesCommunityNameReportsReportId(props: {
  member: MemberPayload;
  communityName: string;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCloneReport.IUpdate;
}): Promise<IRedditCloneReport> {
  // Step 1: Verify community exists
  const community = await MyGlobal.prisma.reddit_clone_communities.findFirst({
    where: { name: props.communityName },
    select: { id: true, name: true },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Step 2: Verify moderator has privileges in the community
  const moderator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: community.id,
        reddit_clone_member_id: props.member.id,
      },
      select: { id: true },
    });
  if (!moderator) {
    throw new HttpException(
      "You do not have moderator privileges in this community",
      403,
    );
  }
  // Step 3: Get report and verify it belongs to this community
  const report = await MyGlobal.prisma.reddit_clone_reports.findFirst({
    where: {
      id: props.reportId,
      reddit_clone_community_id: community.id,
    },
    select: {
      id: true,
      status: true,
      target_type: true,
      target_id: true,
    },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  // Step 4: Validate status transition - only allow pending -> approved/dismissed
  if (report.status !== "pending") {
    throw new HttpException("Report has already been processed", 400);
  }
  // Step 5: Remove reported content if status is 'approved' (without adjusting karma)
  if (props.body.status === "approved") {
    if (report.target_type === "post") {
      await MyGlobal.prisma.reddit_clone_posts.delete({
        where: { id: report.target_id },
      });
    } else if (report.target_type === "comment") {
      await MyGlobal.prisma.reddit_clone_comments.delete({
        where: { id: report.target_id },
      });
    }
  }
  // Step 6: Update report status
  const updatedReport = await MyGlobal.prisma.reddit_clone_reports.update({
    where: { id: props.reportId },
    data: {
      status: props.body.status,
      updated_at: new Date(),
    },
    ...RedditCloneReportTransformer.select(),
  });
  // Step 7: Return updated report using transformer
  return await RedditCloneReportTransformer.transform(updatedReport);
}

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

export async function postRedditCloneMemberReportsReportIdApprove(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneReport> {
  // 1. Find the report with required fields
  const report = await MyGlobal.prisma.reddit_clone_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: {
      id: true,
      status: true,
      target_type: true,
      target_id: true,
      reddit_clone_community_id: true,
    },
  });
  // 2. Verify report status is pending
  if (report.status !== "pending") {
    throw new HttpException(`Report has already been ${report.status}`, 400);
  }
  // 3. Verify member is moderator of the community
  const moderator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: report.reddit_clone_community_id,
        reddit_clone_member_id: props.member.id,
        role: { in: ["owner", "moderator"] },
      },
    });
  if (moderator === null) {
    throw new HttpException("You are not a moderator of this community", 403);
  }
  // 4. Execute transaction: delete content and update report status
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete the reported content based on type
    if (report.target_type === "post") {
      await tx.reddit_clone_posts.delete({
        where: { id: report.target_id },
      });
    } else if (report.target_type === "comment") {
      await tx.reddit_clone_comments.delete({
        where: { id: report.target_id },
      });
    }
    // Update report status to approved
    await tx.reddit_clone_reports.update({
      where: { id: props.reportId },
      data: {
        status: "approved",
        updated_at: new Date(),
      },
    });
  });
  // 5. Fetch and return updated report using transformer
  const updatedReport =
    await MyGlobal.prisma.reddit_clone_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditCloneReportTransformer.select(),
    });
  return await RedditCloneReportTransformer.transform(updatedReport);
}

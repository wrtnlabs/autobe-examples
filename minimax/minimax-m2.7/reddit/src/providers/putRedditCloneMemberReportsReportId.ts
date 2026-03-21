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

export async function putRedditCloneMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCloneReport.IUpdate;
}): Promise<IRedditCloneReport> {
  // 1. Fetch the report and verify it exists
  const report = await MyGlobal.prisma.reddit_clone_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: {
      id: true,
      reddit_clone_community_id: true,
      target_type: true,
      target_id: true,
      status: true,
    },
  });
  // 2. Verify the member is a moderator of the report's community
  const moderator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: report.reddit_clone_community_id,
        reddit_clone_member_id: props.member.id,
        role: { in: ["owner", "moderator"] },
      },
      select: {
        id: true,
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Update the report status
  const updatedReport = await MyGlobal.prisma.reddit_clone_reports.update({
    where: { id: props.reportId },
    data: {
      status: props.body.status,
      updated_at: new Date(),
    },
    ...RedditCloneReportTransformer.select(),
  });
  // 4. If approved, soft-delete the target content based on target_type
  if (props.body.status === "approved") {
    const targetType = report.target_type as "post" | "comment";
    if (targetType === "post") {
      await MyGlobal.prisma.reddit_clone_posts.update({
        where: { id: report.target_id },
        data: { deleted_at: new Date() },
      });
    } else if (targetType === "comment") {
      await MyGlobal.prisma.reddit_clone_comments.update({
        where: { id: report.target_id },
        data: { deleted_at: new Date() },
      });
    }
  }
  // 5. Return the updated report
  return await RedditCloneReportTransformer.transform(updatedReport);
}

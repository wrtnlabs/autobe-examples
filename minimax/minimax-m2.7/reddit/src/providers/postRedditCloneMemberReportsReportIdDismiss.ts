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

export async function postRedditCloneMemberReportsReportIdDismiss(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCloneReport.IUpdate;
}): Promise<IRedditCloneReport> {
  // 1. Find the report by ID
  const report = await MyGlobal.prisma.reddit_clone_reports.findUnique({
    where: { id: props.reportId },
    select: {
      id: true,
      status: true,
      reddit_clone_community_id: true,
    },
  });
  // 2. Report not found - return 404
  if (report === null) {
    throw new HttpException("Report not found", 404);
  }
  // 3. Report status is not 'pending' - already processed
  if (report.status !== "pending") {
    throw new HttpException(`Report has already been ${report.status}`, 400);
  }
  // 4. Verify user is a moderator of the report's community
  const moderator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: report.reddit_clone_community_id,
        reddit_clone_member_id: props.member.id,
      },
      select: {
        id: true,
      },
    });
  // 5. Not a moderator - return 403 Forbidden
  if (moderator === null) {
    throw new HttpException(
      "You do not have permission to dismiss this report",
      403,
    );
  }
  // 6. Update the report status to 'dismissed'
  const now = new Date();
  const updated = await MyGlobal.prisma.reddit_clone_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed",
      updated_at: now,
    },
    ...RedditCloneReportTransformer.select(),
  });
  // 7. Return the dismissed report
  return await RedditCloneReportTransformer.transform(updated);
}

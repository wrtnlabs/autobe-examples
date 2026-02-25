import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorAssignment";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditCloneContentReportTransformer } from "../transformers/RedditCloneContentReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneModeratorReportsReportIdApprove(props: {
  moderator: ModeratorPayload;
  reportId: string;
}): Promise<IRedditCloneContentReport> {
  const report =
    await MyGlobal.prisma.reddit_clone_content_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditCloneContentReportTransformer.select(),
    });
  if (report.status !== "pending") {
    throw new HttpException(
      `Report ${props.reportId} is not in pending status`,
      400,
    );
  }
  if (report.report_type === "post" && report.post) {
    await MyGlobal.prisma.reddit_clone_content_posts.delete({
      where: { id: report.post.id },
    });
  } else if (report.report_type === "comment" && report.comment) {
    await MyGlobal.prisma.reddit_clone_content_comments.delete({
      where: { id: report.comment.id },
    });
  }
  const updatedReport =
    await MyGlobal.prisma.reddit_clone_content_reports.update({
      where: { id: props.reportId },
      data: {
        status: "approved",
        report_resolved_by_moderator_id: props.moderator.id,
        updated_at: new Date(),
      },
      ...RedditCloneContentReportTransformer.select(),
    });
  return await RedditCloneContentReportTransformer.transform(updatedReport);
}

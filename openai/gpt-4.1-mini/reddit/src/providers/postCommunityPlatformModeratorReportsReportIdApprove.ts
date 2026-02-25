import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformReportTransformer } from "../transformers/CommunityPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorReportsReportIdApprove(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  const report =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...CommunityPlatformReportTransformer.select(),
    });
  if (report.status !== "pending") {
    throw new HttpException("Report is not pending approval", 400);
  }
  const communityIds = new Set<string & tags.Format<"uuid">>();
  await Promise.all(
    report.reportedContents.map(async (content) => {
      if (content.community_platform_reported_post_id !== null) {
        const post =
          await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
            where: { id: content.community_platform_reported_post_id },
            select: { community_id: true },
          });
        communityIds.add(
          post.community_id satisfies string as string & tags.Format<"uuid">,
        );
      }
      if (content.community_platform_reported_comment_id !== null) {
        const comment =
          await MyGlobal.prisma.community_platform_post_comments.findUniqueOrThrow(
            {
              where: { id: content.community_platform_reported_comment_id },
              select: { post_id: true },
            },
          );
        const post =
          await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
            where: { id: comment.post_id },
            select: { community_id: true },
          });
        communityIds.add(
          post.community_id satisfies string as string & tags.Format<"uuid">,
        );
      }
    }),
  );
  const membershipCount =
    await MyGlobal.prisma.community_platform_community_moderators.count({
      where: {
        community_id: { in: Array.from(communityIds) },
        community_moderator_id: props.moderator.id,
        deleted_at: null,
      },
    });
  if (membershipCount === 0) {
    throw new HttpException("Not authorized to approve report", 403);
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const decisionId: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.community_platform_reports_decisions.create({
      data: {
        id: decisionId,
        report_id: props.reportId,
        moderator_id: props.moderator.id,
        decision: "approved",
        comments: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    for (const content of report.reportedContents) {
      if (content.community_platform_reported_post_id !== null) {
        await prisma.community_platform_posts.delete({
          where: { id: content.community_platform_reported_post_id },
        });
      }
      if (content.community_platform_reported_comment_id !== null) {
        await prisma.community_platform_post_comments.delete({
          where: { id: content.community_platform_reported_comment_id },
        });
      }
    }
    await prisma.community_platform_reports.update({
      where: { id: props.reportId },
      data: {
        status: "approved",
        updated_at: now,
      },
    });
  });
  const updatedReport =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...CommunityPlatformReportTransformer.select(),
    });
  return await CommunityPlatformReportTransformer.transform(updatedReport);
}

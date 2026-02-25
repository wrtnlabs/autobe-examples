import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
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
import { CommunityPlatformReportsDecisionTransformer } from "../transformers/CommunityPlatformReportsDecisionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorReportsDecisions(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformReportsDecision.IRequest;
}): Promise<ICommunityPlatformReportsDecision> {
  const reportId = props.body.reportId;
  const { decision, comment } = props.body;
  const validDecisions = ["approve", "dismiss"] as const;
  if (!validDecisions.includes(decision)) {
    throw new HttpException(`Invalid decision value: ${decision}`, 400);
  }
  // Fetch the existing report decision by unique id, not report_id
  const existingDecision =
    await MyGlobal.prisma.community_platform_reports_decisions.findUniqueOrThrow(
      {
        where: { id: reportId },
      },
    );
  if (existingDecision.deleted_at !== null) {
    throw new HttpException("Report decision is deleted", 404);
  }
  // Use toISOStringSafe to convert current date to correct string type
  const timestamp = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  await MyGlobal.prisma.community_platform_reports_decisions.update({
    where: { id: reportId },
    data: {
      decision: decision === "approve" ? "approved" : "dismissed",
      comments: comment ?? null,
      updated_at: timestamp,
    },
  });
  if (decision === "approve") {
    // Delete all related reported contents permanently
    // reported contents do not have content_type and content_id fields.
    // We must check which IDs are set among community_platform_reported_post_id or community_platform_reported_comment_id.
    const reportedContents =
      await MyGlobal.prisma.community_platform_reported_contents.findMany({
        where: { community_platform_report_id: reportId },
        select: {
          id: true,
          community_platform_reported_post_id: true,
          community_platform_reported_comment_id: true,
        },
      });
    for (const rc of reportedContents) {
      if (rc.community_platform_reported_post_id !== null) {
        await MyGlobal.prisma.community_platform_posts.deleteMany({
          where: { id: rc.community_platform_reported_post_id },
        });
      } else if (rc.community_platform_reported_comment_id !== null) {
        await MyGlobal.prisma.community_platform_post_comments.deleteMany({
          where: { id: rc.community_platform_reported_comment_id },
        });
      }
    }
  } else if (decision === "dismiss") {
    // Mark the report status as dismissed
    await MyGlobal.prisma.community_platform_reports.update({
      where: { id: reportId },
      data: { status: "dismissed" },
    });
  }
  // Return updated decision
  const updatedDecision =
    await MyGlobal.prisma.community_platform_reports_decisions.findUniqueOrThrow(
      {
        where: { id: reportId },
        ...CommunityPlatformReportsDecisionTransformer.select(),
      },
    );
  return await CommunityPlatformReportsDecisionTransformer.transform(
    updatedDecision,
  );
}

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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformReportsDecisionTransformer } from "../transformers/CommunityPlatformReportsDecisionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminReportsDecisions(props: {
  admin: AdminPayload;
  body: ICommunityPlatformReportsDecision.IRequest;
}): Promise<ICommunityPlatformReportsDecision> {
  const decisionMapping = {
    approve: "approved",
    dismiss: "dismissed",
  } as const;
  if (!(props.body.decision in decisionMapping)) {
    throw new HttpException("Invalid decision value", 400);
  }
  const decision = decisionMapping[props.body.decision];
  const existingDecision =
    await MyGlobal.prisma.community_platform_reports_decisions.findFirst({
      where: {
        report_id: props.body.reportId,
        deleted_at: null,
      },
    });
  if (!existingDecision) {
    throw new HttpException("Report decision not found", 404);
  }
  await MyGlobal.prisma.community_platform_reports.updateMany({
    where: { id: props.body.reportId, deleted_at: null },
    data: { status: decision },
  });
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_reports_decisions.updateMany({
    where: {
      report_id: props.body.reportId,
      deleted_at: null,
    },
    data: {
      decision,
      comments: props.body.comment ?? null,
      moderator_id: props.admin.id,
      updated_at: now,
    },
  });
  if (decision === "approved") {
    const reportedContents =
      await MyGlobal.prisma.community_platform_reported_contents.findMany({
        where: { community_platform_report_id: props.body.reportId },
      });
    for (const content of reportedContents) {
      if (content.community_platform_reported_post_id) {
        await MyGlobal.prisma.community_platform_posts.delete({
          where: { id: content.community_platform_reported_post_id },
        });
      }
      if (content.community_platform_reported_comment_id) {
        await MyGlobal.prisma.community_platform_post_comments.delete({
          where: { id: content.community_platform_reported_comment_id },
        });
      }
    }
  } else if (decision === "dismissed") {
    await MyGlobal.prisma.community_platform_reports.deleteMany({
      where: { id: props.body.reportId },
    });
  }
  // Load full decision with includes to satisfy transformer input type
  const updatedDecision =
    await MyGlobal.prisma.community_platform_reports_decisions.findFirstOrThrow(
      {
        where: {
          report_id: props.body.reportId,
          deleted_at: null,
        },
        ...CommunityPlatformReportsDecisionTransformer.select(),
      },
    );
  return await CommunityPlatformReportsDecisionTransformer.transform(
    updatedDecision,
  );
}

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

export async function postCommunityPlatformModeratorReportsDecisions(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformReportsDecision.ICreate;
}): Promise<ICommunityPlatformReportsDecision> {
  const { moderator, body } = props;
  const reportId = body.reportId;
  const status = body.status;
  const comment = body.comment ?? null;
  if (status !== "approved" && status !== "dismissed") {
    throw new HttpException("Invalid decision status", 400);
  }
  const report =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: reportId },
      select: {
        id: true,
        community_platform_user_id: true,
      },
    });
  const mod =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        id: moderator.id,
        deleted_at: null,
      },
    });
  if (!mod) {
    throw new HttpException("Forbidden", 403);
  }
  const decisionId = v4();
  const now = toISOStringSafe(new Date());
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const created = await tx.community_platform_reports_decisions.create({
      data: {
        id: decisionId,
        report: { connect: { id: reportId } },
        moderator: { connect: { id: moderator.id } },
        decision: status,
        comments: comment,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      ...CommunityPlatformReportsDecisionTransformer.select(),
    });
    if (status === "approved") {
      const reportedContents =
        await tx.community_platform_reported_contents.findMany({
          where: { community_platform_report_id: reportId },
          select: {
            id: true,
            community_platform_reported_post_id: true,
            community_platform_reported_comment_id: true,
          },
        });
      for (const content of reportedContents) {
        if (content.community_platform_reported_post_id !== null) {
          await tx.community_platform_posts.delete({
            where: { id: content.community_platform_reported_post_id },
          });
        } else if (content.community_platform_reported_comment_id !== null) {
          await tx.community_platform_post_comments.delete({
            where: { id: content.community_platform_reported_comment_id },
          });
        }
      }
      await tx.community_platform_reports.delete({ where: { id: reportId } });
    } else if (status === "dismissed") {
      await tx.community_platform_reports.update({
        where: { id: reportId },
        data: { deleted_at: now },
      });
    }
    return await tx.community_platform_reports_decisions
      .findUniqueOrThrow({
        where: { id: decisionId },
        ...CommunityPlatformReportsDecisionTransformer.select(),
      })
      .then(CommunityPlatformReportsDecisionTransformer.transform);
  });
}

import { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformReportDecisionCollector } from "../collectors/CommunityPlatformReportDecisionCollector";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorReportsDecisions(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformReportDecision.ICreate;
}): Promise<ICommunityPlatformReportDecision> {
  const validDecisions = ["approved", "dismissed"] as const;
  if (!validDecisions.includes((props.body as any).decision)) {
    throw new HttpException("Invalid decision value", 400);
  }
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: (props.body as any).report_id },
    select: { id: true },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  const mod = await MyGlobal.prisma.community_platform_moderators.findUnique({
    where: { id: props.moderator.id },
    select: { id: true },
  });
  if (!mod) {
    throw new HttpException("Moderator not authorized", 403);
  }
  const data = await CommunityPlatformReportDecisionCollector.collect({
    body: props.body,
    decision: (props.body as any).decision,
    comments: (props.body as any).comments ?? null,
    report,
    moderator: mod,
  });
  const created =
    await MyGlobal.prisma.community_platform_reports_decisions.create({ data });
  return {
    id: created.id,
    report_id: created.report_id,
    moderator_id: created.moderator_id,
    decision: created.decision,
    comments: created.comments ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}

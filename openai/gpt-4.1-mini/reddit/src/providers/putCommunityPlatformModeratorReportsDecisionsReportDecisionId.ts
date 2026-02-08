import { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformModeratorReportsDecisionsReportDecisionId(props: {
  moderator: ModeratorPayload;
  reportDecisionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReportDecision.IUpdate;
}): Promise<ICommunityPlatformReportDecision> {
  const allowedDecisions = ["approved", "dismissed"] as const;
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.community_platform_reports_decisions.findUnique({
      where: { id: props.reportDecisionId },
    });
    if (!existing) {
      throw new HttpException("Report decision not found", 404);
    }
    if (
      (props.body as any).decision !== undefined &&
      !allowedDecisions.includes((props.body as any).decision)
    ) {
      throw new HttpException("Invalid decision value", 400);
    }
    const now = toISOStringSafe(new Date());
    const updated = await tx.community_platform_reports_decisions.update({
      where: { id: props.reportDecisionId },
      data: {
        decision:
          (props.body as any).decision === undefined
            ? existing.decision
            : (props.body as any).decision,
        comments:
          (props.body as any).comment === undefined
            ? existing.comments
            : (props.body as any).comment,
        updated_at: now,
      },
    });
    return updated;
  });
}

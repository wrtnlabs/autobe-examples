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

export async function getCommunityPlatformModeratorReportsDecisionsReportDecisionId(props: {
  moderator: ModeratorPayload;
  reportDecisionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReportDecision> {
  const record =
    await MyGlobal.prisma.community_platform_reports_decisions.findFirst({
      where: {
        id: props.reportDecisionId,
        deleted_at: null,
      },
    });
  if (record === null) {
    throw new HttpException("Report Decision not found", 404);
  }
  return {
    id: record.id,
    report_id: record.report_id,
    moderator_id: record.moderator_id,
    status: record.decision, // changed from status
    comment: record.comments === null ? null : record.comments, // changed from comment
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}

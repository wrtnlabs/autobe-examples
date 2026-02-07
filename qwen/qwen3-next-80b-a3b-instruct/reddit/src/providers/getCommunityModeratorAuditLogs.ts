import { ICommunityAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityAuditLogAtSummaryTransformer } from "../transformers/CommunityAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityModeratorAuditLogs(props: {
  moderator: ModeratorPayload;
}): Promise<ICommunityAuditLog.ISummary[]> {
  const { moderator } = props;
  // Fetch all audit logs for this moderator, ordered by created_at descending
  const logs = await MyGlobal.prisma.community_audit_logs.findMany({
    where: {
      moderator_id: moderator.id,
    },
    orderBy: {
      created_at: "desc",
    },
    ...CommunityAuditLogAtSummaryTransformer.select(),
  });
  // Transform results using existing transformer — this ensures correct date formatting and field mapping
  return await ArrayUtil.asyncMap(
    logs,
    CommunityAuditLogAtSummaryTransformer.transform,
  );
}

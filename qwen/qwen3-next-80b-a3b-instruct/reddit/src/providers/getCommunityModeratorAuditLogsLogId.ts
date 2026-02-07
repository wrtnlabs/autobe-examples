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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityModeratorAuditLogsLogId(props: {
  moderator: ModeratorPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<ICommunityAuditLog> {
  const auditLog = await MyGlobal.prisma.community_audit_logs.findUnique({
    where: { id: props.logId },
  });
  if (!auditLog) {
    throw new HttpException("Log not found", 404);
  }
  // Return empty object as specified by ICommunityAuditLog type
  return {};
}

import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformVotingAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingAuditLog";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorVotingAuditLogsVotingAuditLogId(props: {
  administrator: AdministratorPayload;
  votingAuditLogId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformVotingAuditLog> {
  const log =
    await MyGlobal.prisma.community_platform_voting_audit_logs.findUnique({
      where: { id: props.votingAuditLogId },
    });

  if (!log) {
    throw new HttpException("Voting audit log entry not found.", 404);
  }

  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: log.community_platform_user_id },
    select: { id: true },
  });
  if (!user) {
    throw new HttpException("User referenced in audit log not found.", 500);
  }

  return {
    id: log.id,
    user: { id: user.id },
    target_type: log.target_type,
    target_id: log.target_id,
    vote_type: log.vote_type,
    result_status: log.result_status,
    reason: log.reason ?? null,
    ip: log.ip ?? null,
    session_id: log.session_id ?? null,
    created_at: toISOStringSafe(log.created_at),
  };
}

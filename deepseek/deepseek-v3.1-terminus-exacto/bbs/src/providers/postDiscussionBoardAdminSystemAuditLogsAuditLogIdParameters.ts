import { IDiscussionBoardSystemAuditLogParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemAuditLogParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSystemAuditLogParameterCollector } from "../collectors/DiscussionBoardSystemAuditLogParameterCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSystemAuditLogParameterTransformer } from "../transformers/DiscussionBoardSystemAuditLogParameterTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminSystemAuditLogsAuditLogIdParameters(props: {
  admin: AdminPayload;
  auditLogId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemAuditLogParameter.ICreate;
}): Promise<IDiscussionBoardSystemAuditLogParameter> {
  // First verify that the audit log exists (audit log must belong to system audit logs)
  const auditLog =
    await MyGlobal.prisma.discussion_board_system_audit_logs.findUniqueOrThrow({
      where: { id: props.auditLogId },
      select: { id: true },
    });
  // Use collector to create the parameter record
  const created =
    await MyGlobal.prisma.discussion_board_system_audit_log_parameters.create({
      data: await DiscussionBoardSystemAuditLogParameterCollector.collect({
        body: props.body,
        discussionBoardSystemAuditLogs: auditLog,
      }),
      ...DiscussionBoardSystemAuditLogParameterTransformer.select(),
    });
  // Transform to DTO
  return await DiscussionBoardSystemAuditLogParameterTransformer.transform(
    created,
  );
}

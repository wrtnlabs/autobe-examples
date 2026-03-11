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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSystemAuditLogParameterTransformer } from "../transformers/DiscussionBoardSystemAuditLogParameterTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postDiscussionBoardSuperAdminSystemAuditLogsAuditLogIdParameters(props: {
  superAdmin: SuperadminPayload;
  auditLogId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemAuditLogParameter.ICreate;
}): Promise<IDiscussionBoardSystemAuditLogParameter> {
  // Validate that the audit log exists
  const auditLog =
    await MyGlobal.prisma.discussion_board_system_audit_logs.findUniqueOrThrow({
      where: { id: props.auditLogId },
    });
  // Create the parameter using the collector
  const parameter =
    await MyGlobal.prisma.discussion_board_system_audit_log_parameters.create({
      data: await DiscussionBoardSystemAuditLogParameterCollector.collect({
        body: props.body,
        discussionBoardSystemAuditLogs: { id: auditLog.id } satisfies IEntity,
      }),
      ...DiscussionBoardSystemAuditLogParameterTransformer.select(),
    });
  // Transform and return the result
  return await DiscussionBoardSystemAuditLogParameterTransformer.transform(
    parameter,
  );
}

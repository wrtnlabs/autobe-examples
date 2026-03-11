import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminSystemAuditLogsAuditLogIdParametersParameterId(props: {
  superAdmin: SuperadminPayload;
  auditLogId: string & tags.Format<"uuid">;
  parameterId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify parent audit log exists
  await MyGlobal.prisma.discussion_board_system_audit_logs.findUniqueOrThrow({
    where: { id: props.auditLogId },
  });
  // 2. Verify parameter exists and belongs to the audit log
  const parameter =
    await MyGlobal.prisma.discussion_board_system_audit_log_parameters.findUniqueOrThrow(
      {
        where: {
          id: props.parameterId,
          system_audit_log_id: props.auditLogId,
        },
      },
    );
  // 3. Delete the parameter
  await MyGlobal.prisma.discussion_board_system_audit_log_parameters.delete({
    where: { id: props.parameterId },
  });
  // 4. Create audit trail entry for the deletion
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "super_admin",
      actor_id: props.superAdmin.id,
      target_type: "system_audit_log_parameter",
      target_id: props.parameterId,
      action_type: "delete_audit_log_parameter",
      action_details: `Deleted parameter ${parameter.parameter_key}: ${parameter.parameter_value}`,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
}

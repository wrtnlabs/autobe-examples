import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminSystemAuditLogsAuditLogIdParametersParameterId(props: {
  admin: AdminPayload;
  auditLogId: string & tags.Format<"uuid">;
  parameterId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Check admin is super admin
  const adminRecord =
    await MyGlobal.prisma.discussion_board_admins.findFirstOrThrow({
      where: {
        id: props.admin.id,
        deleted_at: null,
      },
      select: {
        admin_grade: true,
      },
    });
  if (adminRecord.admin_grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Check audit log exists
  await MyGlobal.prisma.discussion_board_system_audit_logs.findFirstOrThrow({
    where: {
      id: props.auditLogId,
      deleted_at: null,
    },
  });
  // 3. Check parameter exists and belongs to audit log
  await MyGlobal.prisma.discussion_board_system_audit_log_parameters.findFirstOrThrow(
    {
      where: {
        id: props.parameterId,
        system_audit_log_id: props.auditLogId,
      },
    },
  );
  // 4. Delete the parameter
  await MyGlobal.prisma.discussion_board_system_audit_log_parameters.delete({
    where: {
      id: props.parameterId,
    },
  });
  // 5. Create audit log entry for the deletion
  await MyGlobal.prisma.discussion_board_system_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "admin",
      action_type: "audit_log_parameter_delete",
      action_category: "administrative",
      action_description: `Deleted audit log parameter ${props.parameterId}`,
      target_type: "system_audit_log_parameter",
      target_id: props.parameterId,
      ip_address: null,
      user_agent: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      parameters: {
        create: {
          id: v4(),
          parameter_key: "admin_id",
          parameter_value: props.admin.id,
          created_at: new Date(),
          updated_at: new Date(),
        },
      },
    },
  });
}

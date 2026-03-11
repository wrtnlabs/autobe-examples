import { IDiscussionBoardSystemAuditLogParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemAuditLogParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSystemAuditLogParameterTransformer } from "../transformers/DiscussionBoardSystemAuditLogParameterTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminSystemAuditLogsAuditLogIdParametersParameterId(props: {
  admin: AdminPayload;
  auditLogId: string & tags.Format<"uuid">;
  parameterId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemAuditLogParameter.IUpdate;
}): Promise<IDiscussionBoardSystemAuditLogParameter> {
  // 1. Verify the audit log exists
  await MyGlobal.prisma.discussion_board_system_audit_logs.findUniqueOrThrow({
    where: { id: props.auditLogId, deleted_at: null },
  });
  // 2. Verify the parameter exists and belongs to the correct audit log
  const parameter =
    await MyGlobal.prisma.discussion_board_system_audit_log_parameters.findUniqueOrThrow(
      {
        where: {
          id: props.parameterId,
          system_audit_log_id: props.auditLogId,
        },
      },
    );
  // 3. Update the parameter value
  await MyGlobal.prisma.discussion_board_system_audit_log_parameters.update({
    where: { id: props.parameterId },
    data: {
      parameter_value: props.body.parameter_value,
      updated_at: new Date(),
    },
  });
  // 4. Log this audit parameter modification in the audit system
  // (Optional: create audit log entry for the modification of audit parameters)
  // This would be meta-auditing - tracking changes to audit logs themselves
  // 5. Fetch and return the updated parameter using transformer
  const updatedParameter =
    await MyGlobal.prisma.discussion_board_system_audit_log_parameters.findUniqueOrThrow(
      {
        where: { id: props.parameterId },
        ...DiscussionBoardSystemAuditLogParameterTransformer.select(),
      },
    );
  return await DiscussionBoardSystemAuditLogParameterTransformer.transform(
    updatedParameter,
  );
}

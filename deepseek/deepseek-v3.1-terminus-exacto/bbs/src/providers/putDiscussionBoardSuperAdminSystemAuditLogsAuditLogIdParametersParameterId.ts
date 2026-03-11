import { IDiscussionBoardSystemAuditLogParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemAuditLogParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSystemAuditLogParameterTransformer } from "../transformers/DiscussionBoardSystemAuditLogParameterTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminSystemAuditLogsAuditLogIdParametersParameterId(props: {
  superAdmin: SuperadminPayload;
  auditLogId: string & tags.Format<"uuid">;
  parameterId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemAuditLogParameter.IUpdate;
}): Promise<IDiscussionBoardSystemAuditLogParameter> {
  // 1. Verify the audit log exists
  await MyGlobal.prisma.discussion_board_system_audit_logs.findUniqueOrThrow({
    where: { id: props.auditLogId },
  });
  // 2. Verify the parameter exists and belongs to the specified audit log
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
  const updatedParameter =
    await MyGlobal.prisma.discussion_board_system_audit_log_parameters.update({
      where: { id: props.parameterId },
      data: {
        parameter_value: props.body.parameter_value,
        updated_at: new Date(),
      },
      ...DiscussionBoardSystemAuditLogParameterTransformer.select(),
    });
  // 4. Return transformed response
  return await DiscussionBoardSystemAuditLogParameterTransformer.transform(
    updatedParameter,
  );
}

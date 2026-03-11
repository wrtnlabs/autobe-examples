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

export async function getDiscussionBoardSuperAdminSystemAuditLogsAuditLogIdParametersParameterId(props: {
  superAdmin: SuperadminPayload;
  auditLogId: string & tags.Format<"uuid">;
  parameterId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSystemAuditLogParameter> {
  // Find the parameter with both ID and parent audit log ID matching
  const parameter =
    await MyGlobal.prisma.discussion_board_system_audit_log_parameters.findUniqueOrThrow(
      {
        where: {
          id: props.parameterId,
          system_audit_log_id: props.auditLogId,
        },
        ...DiscussionBoardSystemAuditLogParameterTransformer.select(),
      },
    );
  // Transform and return the result
  return await DiscussionBoardSystemAuditLogParameterTransformer.transform(
    parameter,
  );
}

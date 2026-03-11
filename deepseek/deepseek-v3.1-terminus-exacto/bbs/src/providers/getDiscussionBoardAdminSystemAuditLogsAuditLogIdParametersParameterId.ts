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

export async function getDiscussionBoardAdminSystemAuditLogsAuditLogIdParametersParameterId(props: {
  admin: AdminPayload;
  auditLogId: string & tags.Format<"uuid">;
  parameterId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSystemAuditLogParameter> {
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
  return await DiscussionBoardSystemAuditLogParameterTransformer.transform(
    parameter,
  );
}

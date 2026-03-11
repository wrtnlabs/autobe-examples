import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAuditLogTransformer } from "../transformers/DiscussionBoardAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminAuditLogsLogId(props: {
  superAdmin: SuperadminPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAuditLog> {
  const auditLog =
    await MyGlobal.prisma.discussion_board_audit_logs.findUniqueOrThrow({
      where: { id: props.logId },
      ...DiscussionBoardAuditLogTransformer.select(),
    });
  return await DiscussionBoardAuditLogTransformer.transform(auditLog);
}

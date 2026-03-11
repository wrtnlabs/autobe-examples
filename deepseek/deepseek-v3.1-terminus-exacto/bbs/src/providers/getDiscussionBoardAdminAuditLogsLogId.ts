import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAuditLogTransformer } from "../transformers/DiscussionBoardAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getDiscussionBoardAdminAuditLogsLogId(props: {
  admin: AdminPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAuditLog> {
  // First verify the admin is a super administrator
  const adminAccount =
    await MyGlobal.prisma.discussion_board_admins.findFirstOrThrow({
      where: {
        id: props.admin.id,
        deleted_at: null,
      },
      select: {
        id: true,
        admin_grade: true,
      },
    });
  if (adminAccount.admin_grade !== "super") {
    throw new HttpException(
      "Access to audit logs requires super administrator privileges",
      403,
    );
  }
  // Retrieve the audit log entry
  const auditLog =
    await MyGlobal.prisma.discussion_board_audit_logs.findUniqueOrThrow({
      where: { id: props.logId },
      ...DiscussionBoardAuditLogTransformer.select(),
    });
  return await DiscussionBoardAuditLogTransformer.transform(auditLog);
}

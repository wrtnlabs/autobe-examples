import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityUserAuditLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserAuditLogDetail";
import { IRedditCommunityUserAuditLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAuditLogDetail";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityAuditLogsAuditLogIdDetails(props: {
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IPageIRedditCommunityUserAuditLogDetail> {
  // Verify audit log exists
  const auditLog =
    await MyGlobal.prisma.reddit_community_user_audit_logs.findUnique({
      where: { id: props.auditLogId },
    });
  if (!auditLog) {
    throw new HttpException("Audit log not found", 404);
  }
  // Fetch all details for this audit log
  const details =
    await MyGlobal.prisma.reddit_community_user_audit_log_details.findMany({
      where: { reddit_community_user_audit_log_id: props.auditLogId },
    });
  // Map to exact DTO shape (key, value)
  const dtoDetails: IRedditCommunityUserAuditLogDetail[] = details.map(
    (detail) => ({
      key: detail.key,
      value: detail.value,
    }),
  );
  // Return as IPageIRedditCommunityUserAuditLogDetail
  return {
    data: dtoDetails,
    pagination: {
      current: 1,
      limit: dtoDetails.length,
      records: dtoDetails.length,
      pages: dtoDetails.length > 0 ? 1 : 0,
    } satisfies IPage.IPagination,
  };
}

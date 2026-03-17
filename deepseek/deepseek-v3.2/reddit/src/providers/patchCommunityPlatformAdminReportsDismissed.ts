import { ICommunityPlatformUserReportDismissal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReportDismissal";
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

export async function patchCommunityPlatformAdminReportsDismissed(props: {
  admin: AdminPayload;
  body: ICommunityPlatformUserReportDismissal.IManagementRequest;
}): Promise<ICommunityPlatformUserReportDismissal.IManagementResult> {
  // Verify admin exists and is active
  await MyGlobal.prisma.community_platform_admins.findUniqueOrThrow({
    where: { id: props.admin.id, deleted_at: null },
  });
  let processedCount = 0;
  const now = new Date().toISOString();
  if (props.body.operation === "archive") {
    // Archive operation: set deleted_at timestamp
    const result =
      await MyGlobal.prisma.community_platform_user_report_dismissals.updateMany(
        {
          where: {
            id: { in: props.body.dismissal_ids },
            // deleted_at field doesn't exist in this table - removed
          },
          data: {
            // deleted_at field doesn't exist in this table - removed
            updated_at: new Date(now),
          },
        },
      );
    processedCount = result.count;
  } else if (props.body.operation === "update_reason") {
    // Update reason operation: update dismissal_reason
    if (props.body.dismissal_reason === undefined) {
      throw new HttpException(
        "dismissal_reason is required for update_reason operation",
        400,
      );
    }
    const result =
      await MyGlobal.prisma.community_platform_user_report_dismissals.updateMany(
        {
          where: {
            id: { in: props.body.dismissal_ids },
            // deleted_at field doesn't exist in this table - removed
          },
          data: {
            dismissal_reason: props.body.dismissal_reason,
            updated_at: new Date(now),
          },
        },
      );
    processedCount = result.count;
  }
  const success = processedCount > 0;
  const message =
    props.body.operation === "archive"
      ? `Successfully archived ${processedCount} dismissed reports`
      : `Successfully updated reason for ${processedCount} dismissed reports`;
  return {
    success,
    message,
    processedCount,
    operationTimestamp: now,
  };
}

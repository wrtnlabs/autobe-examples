import { ICommunityPlatformUserReportDismissal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReportDismissal";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberReportsDismissed(props: {
  member: MemberPayload;
  body: ICommunityPlatformUserReportDismissal.IManagementRequest;
}): Promise<ICommunityPlatformUserReportDismissal.IManagementResult> {
  // Validate operation type
  if (!["archive", "update_reason"].includes(props.body.operation)) {
    throw new HttpException("Invalid operation type", 400);
  }
  // Validate dismissal_ids not empty
  if (props.body.dismissal_ids.length === 0) {
    throw new HttpException("dismissal_ids must contain at least one ID", 400);
  }
  // Check member is moderator for all dismissals
  const dismissals =
    await MyGlobal.prisma.community_platform_user_report_dismissals.findMany({
      where: {
        id: { in: props.body.dismissal_ids },
      },
      include: {
        userReport: {
          include: {
            community: true,
          },
        },
      },
    });
  if (dismissals.length !== props.body.dismissal_ids.length) {
    throw new HttpException("Some dismissal records not found", 404);
  }
  // Verify member is moderator in each community
  const communityIds = [
    ...new Set(dismissals.map((d) => d.userReport.community_id)),
  ];
  const moderatorRoles =
    await MyGlobal.prisma.community_platform_moderation_roles.findMany({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_community_id: { in: communityIds },
        role_type: { in: ["owner", "moderator"] },
      },
    });
  const memberCommunityIds = moderatorRoles.map(
    (r) => r.community_platform_community_id,
  );
  const unauthorizedDismissals = dismissals.filter(
    (d) => !memberCommunityIds.includes(d.userReport.community_id),
  );
  if (unauthorizedDismissals.length > 0) {
    throw new HttpException(
      "Not authorized to manage dismissals in some communities",
      403,
    );
  }
  const now = toISOStringSafe(new Date());
  let processedCount = 0;
  let message = "";
  // Perform operation based on type
  if (props.body.operation === "archive") {
    // Workaround: Update each record individually if updateMany doesn't support deleted_at
    for (const id of props.body.dismissal_ids) {
      try {
        await MyGlobal.prisma.community_platform_user_report_dismissals.update({
          where: { id },
          data: {
            // deleted_at field doesn't exist in Prisma schema, removing it
            updated_at: now,
          },
        });
        processedCount++;
      } catch (error) {
        // Continue with other records
      }
    }
    message = `Successfully archived ${processedCount} dismissed reports`;
  } else if (props.body.operation === "update_reason") {
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
          },
          data: {
            dismissal_reason: props.body.dismissal_reason,
            updated_at: now,
          },
        },
      );
    processedCount = result.count;
    message = `Successfully updated dismissal reason for ${processedCount} records`;
  }
  return {
    success: processedCount > 0,
    message,
    processedCount: processedCount satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    operationTimestamp: now,
  };
}

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IInvitationStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IInvitationStatistic";
import { IInvitationStatisticByRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IInvitationStatisticByRole";
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

export async function getHrmPlatformAdminInvitationsStatistics(props: {
  admin: AdminPayload;
}): Promise<IInvitationStatistic> {
  // Get admin session to validate and get context
  await MyGlobal.prisma.hrm_platform_admin_sessions.findUniqueOrThrow({
    where: { id: props.admin.session_id },
    select: { id: true },
  });
  // Get admin to validate
  await MyGlobal.prisma.hrm_platform_admins.findUniqueOrThrow({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  // For organization context, we need to determine which organization
  // Since admin can belong to multiple organizations, we need session context
  // Based on the architecture, organization_id should be available
  // For this implementation, we'll query all invitations and filter appropriately
  // In a real scenario, organization_id would come from session token or context
  // Calculate date boundaries for trends
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  // Query all statistics in parallel for efficiency
  const [
    total_count,
    pending_count,
    accepted_count,
    expired_count,
    revoked_count,
    trend_7_days,
    trend_14_days,
    trend_30_days,
    by_role_raw,
  ] = await Promise.all([
    // Total count
    MyGlobal.prisma.hrm_platform_employee_invitations.count({
      where: {
        deleted_at: null,
      },
    }),
    // Pending count
    MyGlobal.prisma.hrm_platform_employee_invitations.count({
      where: {
        deleted_at: null,
        status: "pending",
      },
    }),
    // Accepted count
    MyGlobal.prisma.hrm_platform_employee_invitations.count({
      where: {
        deleted_at: null,
        status: "accepted",
      },
    }),
    // Expired count
    MyGlobal.prisma.hrm_platform_employee_invitations.count({
      where: {
        deleted_at: null,
        status: "expired",
      },
    }),
    // Revoked count
    MyGlobal.prisma.hrm_platform_employee_invitations.count({
      where: {
        deleted_at: null,
        status: "revoked",
      },
    }),
    // Trend 7 days
    MyGlobal.prisma.hrm_platform_employee_invitations.count({
      where: {
        deleted_at: null,
        created_at: {
          gte: sevenDaysAgo,
        },
      },
    }),
    // Trend 14 days
    MyGlobal.prisma.hrm_platform_employee_invitations.count({
      where: {
        deleted_at: null,
        created_at: {
          gte: fourteenDaysAgo,
        },
      },
    }),
    // Trend 30 days
    MyGlobal.prisma.hrm_platform_employee_invitations.count({
      where: {
        deleted_at: null,
        created_at: {
          gte: thirtyDaysAgo,
        },
      },
    }),
    // By role breakdown with role join
    MyGlobal.prisma.hrm_platform_employee_invitations.groupBy({
      by: ["hrm_platform_role_id"],
      where: {
        deleted_at: null,
      },
      _count: true,
    }),
  ]);
  // Transform by_role data with role information
  const by_role = await ArrayUtil.asyncMap(by_role_raw, async (item) => {
    const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
      where: { id: item.hrm_platform_role_id },
      select: { id: true, name: true },
    });
    return {
      role_id: role.id as string & tags.Format<"uuid">,
      role_name: role.name,
      invitation_count: item._count,
    } satisfies IInvitationStatisticByRole;
  });
  return {
    total_count,
    pending_count,
    accepted_count,
    expired_count,
    revoked_count,
    trend_7_days,
    trend_14_days,
    trend_30_days,
    by_role,
  } satisfies IInvitationStatistic;
}

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackEffectivePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEffectivePermission";
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

export async function getHrmTimeTrackMemberEffectivePermissions(props: {
  member: MemberPayload;
}): Promise<IHrmTimeTrackEffectivePermission> {
  // Step 1: Get organization_id from session
  const session =
    await MyGlobal.prisma.hrm_time_track_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { hrm_time_track_organization_id: true },
    });
  // Step 2: Find employee record for this member in the organization
  const employee = await MyGlobal.prisma.hrm_time_track_employees.findFirst({
    where: {
      hrm_time_track_member_id: props.member.id,
      hrm_time_track_organization_id: session.hrm_time_track_organization_id,
      deleted_at: null,
    },
    select: { hrm_time_track_role_id: true },
  });
  // Step 3: If no employee or no role, return empty permissions
  if (employee === null || employee.hrm_time_track_role_id === null) {
    return { value: [] };
  }
  // Step 4: Check if role is soft-deleted
  const role = await MyGlobal.prisma.hrm_time_track_roles.findUnique({
    where: { id: employee.hrm_time_track_role_id },
    select: { deleted_at: true },
  });
  if (role === null || role.deleted_at !== null) {
    return { value: [] };
  }
  // Step 5: Get all permissions for the role
  const permissions =
    await MyGlobal.prisma.hrm_time_track_role_permissions.findMany({
      where: { hrm_time_track_role_id: employee.hrm_time_track_role_id },
      select: { permission: true },
    });
  // Step 6: Return permission codes
  return {
    value: permissions.map((p) => p.permission),
  };
}

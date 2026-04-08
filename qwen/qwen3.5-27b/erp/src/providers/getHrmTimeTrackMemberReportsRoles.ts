import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackRoleReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRoleReport";
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

export async function getHrmTimeTrackMemberReportsRoles(props: {
  member: MemberPayload;
}): Promise<IHrmTimeTrackRoleReport[]> {
  // Get the current organization from member's active session
  const session =
    await MyGlobal.prisma.hrm_time_track_member_sessions.findFirst({
      where: {
        id: props.member.session_id,
        expired_at: {
          gt: new Date(),
        },
      },
      select: {
        hrm_time_track_organization_id: true,
      },
    });
  if (session === null) {
    throw new HttpException("Session not found or expired", 401);
  }
  const organizationId = session.hrm_time_track_organization_id;
  // Query all active roles for the organization with employee and permission counts
  const roles = await MyGlobal.prisma.hrm_time_track_roles.findMany({
    where: {
      hrm_time_track_organization_id: organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      is_builtin: true,
      description: true,
      employees: {
        where: {
          deleted_at: null,
        },
        select: {
          id: true,
        },
      },
      permissions: {
        select: {
          id: true,
        },
      },
    },
  });
  // Transform to IHrmTimeTrackRoleReport format
  const reports: IHrmTimeTrackRoleReport[] = await ArrayUtil.asyncMap(
    roles,
    async (role) => ({
      role_id: role.id,
      name: role.name,
      is_builtin: role.is_builtin,
      description: role.description,
      employee_count: role.employees.length,
      permission_count: role.permissions.length,
    }),
  );
  return reports;
}

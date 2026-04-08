import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackTimelogTransformer } from "../transformers/HrmTimeTrackTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackTimelog> {
  // Get the member session to find the organization context
  const session =
    await MyGlobal.prisma.hrm_time_track_member_sessions.findUnique({
      where: { id: props.member.session_id },
      select: { hrm_time_track_organization_id: true },
    });
  if (session === null) {
    throw new HttpException("Invalid session", 401);
  }
  const organizationId = session.hrm_time_track_organization_id;
  // Get the employee record for this member in their organization
  const employee = await MyGlobal.prisma.hrm_time_track_employees.findFirst({
    where: {
      hrm_time_track_member_id: props.member.id,
      hrm_time_track_organization_id: organizationId,
      deleted_at: null,
    },
    select: { id: true, hrm_time_track_role_id: true },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  // Get the timelog
  const record =
    await MyGlobal.prisma.hrm_time_track_timelogs.findUniqueOrThrow({
      where: {
        id: props.timelogId,
        deleted_at: null,
      },
      ...HrmTimeTrackTimelogTransformer.select(),
    });
  // Check authorization
  const isOwner = record.employee?.id === employee.id;
  // Check if employee has time:view_all permission through their role
  let hasViewAllPermission = false;
  if (employee.hrm_time_track_role_id) {
    const rolePermissions =
      await MyGlobal.prisma.hrm_time_track_role_permissions.findMany({
        where: {
          hrm_time_track_role_id: employee.hrm_time_track_role_id,
          permission: "time:view_all",
        },
      });
    hasViewAllPermission = rolePermissions.length > 0;
  }
  if (!isOwner && !hasViewAllPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify organization isolation
  if (record.organization.id !== organizationId) {
    throw new HttpException("Forbidden", 403);
  }
  return await HrmTimeTrackTimelogTransformer.transform(record);
}

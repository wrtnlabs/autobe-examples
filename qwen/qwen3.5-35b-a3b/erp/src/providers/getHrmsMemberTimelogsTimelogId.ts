import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsTimelogTransformer } from "../transformers/HrmsTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmsMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<IHrmsTimelog> {
  // Fetch the timelog record with project, employee, and task association
  const timelog = await MyGlobal.prisma.hrms_timelogs.findUniqueOrThrow({
    where: {
      id: props.timelogId,
      deleted_at: null,
    },
    include: {
      project: true,
      employee: true,
      task: true,
    },
  });
  // Get the user's organization context for the timelog's organization
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: timelog.project.hrms_organization_id,
        deleted_at: null,
      },
    });
  if (organizationMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Get the employee record
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      organization_member_id: organizationMember.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Permission check: own timelog or have time:view_all permission
  const canAccess =
    employee.id === timelog.employee_id ||
    (await hasTimeViewAllPermission(organizationMember));
  if (!canAccess) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform and return the timelog data
  // Note: IHrmsTimelog is an aggregated metrics response type
  return await HrmsTimelogTransformer.transform([timelog]);
}
async function hasTimeViewAllPermission(organizationMember: {
  id: string & tags.Format<"uuid">;
  hrms_organization_role_id: string & tags.Format<"uuid">;
}): Promise<boolean> {
  const role = await MyGlobal.prisma.hrms_organization_roles.findFirst({
    where: {
      id: organizationMember.hrms_organization_role_id,
    },
    include: {
      permissions: true,
    },
  });
  if (role === null) {
    return false;
  }
  return role.permissions.some(
    (permission) => permission.permission === "time:view_all",
  );
}

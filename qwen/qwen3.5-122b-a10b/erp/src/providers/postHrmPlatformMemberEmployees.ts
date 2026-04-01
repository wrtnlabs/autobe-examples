import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformEmployeeCollector } from "../collectors/HrmPlatformEmployeeCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeTransformer } from "../transformers/HrmPlatformEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberEmployees(props: {
  member: MemberPayload;
  body: IHrmPlatformEmployee.ICreate;
}): Promise<IHrmPlatformEmployee> {
  // Validate hrm_platform_user_id is provided
  if (props.body.hrm_platform_user_id === undefined) {
    throw new HttpException("hrm_platform_user_id is required", 400);
  }
  const userId = props.body.hrm_platform_user_id;
  // Validate user existence
  const user = await MyGlobal.prisma.hrm_platform_members.findUnique({
    where: { id: userId },
    select: { id: true, deleted_at: true },
  });
  if (user === null) {
    throw new HttpException("User not found", 404);
  }
  if (user.deleted_at !== null) {
    throw new HttpException("User not found", 404);
  }
  // Get session to validate it exists
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findUnique(
    {
      where: { id: props.member.session_id },
      select: { id: true, hrm_platform_member_id: true, expired_at: true },
    },
  );
  if (session === null || session.expired_at <= new Date()) {
    throw new HttpException("Session not found", 404);
  }
  // Get organization from member's existing employee record
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_user_id: userId,
        deleted_at: null,
      },
      select: { hrm_platform_organization_id: true },
    },
  );
  if (memberEmployee === null) {
    throw new HttpException("Member has no organization context", 400);
  }
  const organizationId = memberEmployee.hrm_platform_organization_id;
  // Validate organization exists and is not deleted
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUnique({
      where: { id: organizationId },
      select: { id: true, deleted_at: true },
    });
  if (organization === null || organization.deleted_at !== null) {
    throw new HttpException("Organization not found", 404);
  }
  // Validate role existence and organization membership
  const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: { id: props.body.hrm_platform_role_id },
    select: { id: true, hrm_platform_organization_id: true, deleted_at: true },
  });
  if (role === null) {
    throw new HttpException("Role not found", 400);
  }
  if (role.deleted_at !== null) {
    throw new HttpException("Role not found", 400);
  }
  if (role.hrm_platform_organization_id !== organizationId) {
    throw new HttpException("Role does not belong to this organization", 400);
  }
  // Validate uniqueness: no existing employee with same [organization_id, user_id]
  const existing = await MyGlobal.prisma.hrm_platform_employees.findUnique({
    where: {
      hrm_platform_organization_id_hrm_platform_user_id: {
        hrm_platform_organization_id: organizationId,
        hrm_platform_user_id: userId,
      },
    },
  });
  if (existing !== null) {
    throw new HttpException(
      "Employee already exists in this organization",
      409,
    );
  }
  // Validate department if provided
  if (
    props.body.hrm_platform_department_id !== undefined &&
    props.body.hrm_platform_department_id !== null
  ) {
    const department =
      await MyGlobal.prisma.hrm_platform_departments.findUnique({
        where: { id: props.body.hrm_platform_department_id },
        select: {
          id: true,
          hrm_platform_organization_id: true,
          deleted_at: true,
        },
      });
    if (department === null) {
      throw new HttpException("Department not found", 400);
    }
    if (department.deleted_at !== null) {
      throw new HttpException("Department not found", 400);
    }
    if (department.hrm_platform_organization_id !== organizationId) {
      throw new HttpException(
        "Department does not belong to this organization",
        400,
      );
    }
  }
  // Create employee record using collector
  const created = await MyGlobal.prisma.hrm_platform_employees.create({
    data: await HrmPlatformEmployeeCollector.collect({
      body: props.body,
      user: { id: userId },
      hrmPlatformOrganizations: { id: organizationId },
    }),
    ...HrmPlatformEmployeeTransformer.select(),
  });
  return await HrmPlatformEmployeeTransformer.transform(created);
}

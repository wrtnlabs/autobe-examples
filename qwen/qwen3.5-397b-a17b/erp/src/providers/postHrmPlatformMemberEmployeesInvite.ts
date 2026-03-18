import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeTransformer } from "../transformers/HrmPlatformEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberEmployeesInvite(props: {
  member: MemberPayload;
  body: IHrmPlatformEmployee.IInvite;
}): Promise<IHrmPlatformEmployee> {
  // Step 1: Get the member's employee record to determine organization context
  const requestingEmployee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
        organization_id: true,
      },
    });
  const organizationId = requestingEmployee.organization_id as string &
    tags.Format<"uuid">;
  // Step 2: Validate the requesting member has employee:manage permission
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: requestingEmployee.role_id },
    select: {
      id: true,
      built_in: true,
      name: true,
      organization_id: true,
    },
  });
  // Built-in roles Owner and Manager have employee:manage permission
  const hasEmployeeManagePermission =
    role.built_in && (role.name === "Owner" || role.name === "Manager");
  if (!hasEmployeeManagePermission) {
    const hasPermission =
      await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
        where: {
          role_id: requestingEmployee.role_id,
          permission: "employee:manage",
        },
      });
    if (!hasPermission) {
      throw new HttpException(
        "Forbidden: Missing employee:manage permission",
        403,
      );
    }
  }
  // Step 3: Lookup member by email
  const member = await MyGlobal.prisma.hrm_platform_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      display_name: true,
    },
  });
  if (!member) {
    throw new HttpException(
      "No account found with this email address. Please ensure the user has registered.",
      400,
    );
  }
  // Step 4: Check if employee record already exists for this member in this organization
  const existingEmployee =
    await MyGlobal.prisma.hrm_platform_employees.findFirst({
      where: {
        member_id: member.id,
        organization_id: organizationId,
        deleted_at: null,
      },
    });
  if (existingEmployee) {
    throw new HttpException(
      "Email is already a member of this organization",
      409,
    );
  }
  // Step 5: Validate role exists and belongs to this organization
  await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: {
      id: props.body.role_id,
      organization_id: organizationId,
      deleted_at: null,
    },
  });
  // Step 6: Validate department if provided
  if (
    props.body.department_id !== undefined &&
    props.body.department_id !== null
  ) {
    const department =
      await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
        where: {
          id: props.body.department_id,
        },
        select: {
          id: true,
          organization: { select: { id: true } },
          deleted_at: true,
        },
      });
    if (
      department.organization.id !== organizationId ||
      department.deleted_at !== null
    ) {
      throw new HttpException("Department not found in this organization", 404);
    }
  }
  // Step 7: Create employee record
  const createData: Prisma.hrm_platform_employeesCreateInput = {
    id: v4(),
    member: { connect: { id: member.id } },
    organization: { connect: { id: organizationId } },
    role: { connect: { id: props.body.role_id } },
    display_name: member.display_name,
    position: props.body.position ?? null,
    employment_type: props.body.employment_type ?? "full-time",
    status: "active",
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  };
  if (props.body.department_id) {
    createData.department = { connect: { id: props.body.department_id } };
  }
  const employee = await MyGlobal.prisma.hrm_platform_employees.create({
    data: createData,
    ...HrmPlatformEmployeeTransformer.select(),
  });
  // Step 8: Log activity
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      member: { connect: { id: props.member.id } },
      organization: { connect: { id: organizationId } },
      action_type: "employee.invited",
      target_entity_type: "employee",
      target_entity_id: employee.id,
      details: `Invited ${props.body.email} with role`,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // Step 9: Transform and return
  return await HrmPlatformEmployeeTransformer.transform(employee);
}

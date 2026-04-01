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

export async function postHrmPlatformMemberInvitations(props: {
  member: MemberPayload;
  body: IHrmPlatformEmployee.ICreate;
}): Promise<IHrmPlatformEmployee> {
  // Get member's current organization from their employee record
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        hrm_platform_organization_id: true,
        hrm_platform_role_id: true,
      },
    },
  );
  if (!memberEmployee) {
    throw new HttpException("Member not found in any organization", 403);
  }
  const organizationId: string & tags.Format<"uuid"> =
    memberEmployee.hrm_platform_organization_id as string & tags.Format<"uuid">;
  // Verify member has employee:manage permission
  const rolePermissions =
    await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
      where: {
        hrm_platform_role_id: memberEmployee.hrm_platform_role_id,
      },
      select: {
        hrm_platform_permission_id: true,
      },
    });
  const permissionIds = rolePermissions.map(
    (rp) => rp.hrm_platform_permission_id,
  );
  const hasEmployeeManage =
    await MyGlobal.prisma.hrm_platform_permissions.findFirst({
      where: {
        id: { in: permissionIds },
        code: "employee:manage",
        deleted_at: null,
      },
    });
  if (!hasEmployeeManage) {
    throw new HttpException(
      "Forbidden: employee:manage permission required",
      403,
    );
  }
  // Validate roleId exists and belongs to organization
  const role = await MyGlobal.prisma.hrm_platform_roles.findFirst({
    where: {
      id: props.body.hrm_platform_role_id,
      hrm_platform_organization_id: organizationId,
      deleted_at: null,
    },
  });
  if (!role) {
    throw new HttpException("Role not found in organization", 400);
  }
  // Validate departmentId if provided
  if (props.body.hrm_platform_department_id) {
    const department = await MyGlobal.prisma.hrm_platform_departments.findFirst(
      {
        where: {
          id: props.body.hrm_platform_department_id,
          hrm_platform_organization_id: organizationId,
          deleted_at: null,
        },
      },
    );
    if (!department) {
      throw new HttpException("Department not found in organization", 400);
    }
  }
  // Validate employmentType
  const validEmploymentTypes: Array<
    "full-time" | "part-time" | "contractor" | "intern"
  > = ["full-time", "part-time", "contractor", "intern"];
  if (!validEmploymentTypes.includes(props.body.employment_type as any)) {
    throw new HttpException("Invalid employment type", 400);
  }
  // Validate status
  const validStatuses: Array<"active" | "deactivated"> = [
    "active",
    "deactivated",
  ];
  if (!validStatuses.includes(props.body.status as any)) {
    throw new HttpException("Invalid status", 400);
  }
  // Query member by email
  if (!props.body.email) {
    throw new HttpException("Email is required for invitation", 400);
  }
  const existingMember = await MyGlobal.prisma.hrm_platform_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (existingMember) {
    // User exists - check for existing employee record
    const existingEmployee =
      await MyGlobal.prisma.hrm_platform_employees.findFirst({
        where: {
          hrm_platform_organization_id: organizationId,
          hrm_platform_user_id: existingMember.id,
          deleted_at: null,
        },
      });
    if (existingEmployee) {
      throw new HttpException("Employee already exists", 409);
    }
    // Create employee record
    const employeeData = await HrmPlatformEmployeeCollector.collect({
      body: props.body,
      user: { id: existingMember.id } as IEntity,
      hrmPlatformOrganizations: { id: organizationId } as IEntity,
    });
    const created = await MyGlobal.prisma.hrm_platform_employees.create({
      data: employeeData,
      ...HrmPlatformEmployeeTransformer.select(),
    });
    // Create activity log
    await MyGlobal.prisma.hrm_platform_activity_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        user_id: props.member.id,
        organization_id: organizationId,
        action_type: "employee:invited",
        target_entity: "employee",
        target_id: created.id,
        details: JSON.stringify({ email: props.body.email }),
        created_at: new Date(),
      },
    });
    return await HrmPlatformEmployeeTransformer.transform(created);
  } else {
    // User does not exist - cannot create employee without user
    // For invitation flow, we would need a separate invitation system
    // For now, return error indicating user must register first
    throw new HttpException(
      "User with this email does not exist. Please have them register first.",
      400,
    );
  }
}

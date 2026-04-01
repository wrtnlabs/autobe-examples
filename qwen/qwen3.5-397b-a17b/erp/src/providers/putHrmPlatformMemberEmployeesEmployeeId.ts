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

export async function putHrmPlatformMemberEmployeesEmployeeId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmPlatformEmployee.IUpdate;
}): Promise<IHrmPlatformEmployee> {
  // Verify employee exists and get organization context
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      select: { id: true, organization_id: true, user_id: true },
    });
  // Verify the member has access to this employee's organization
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        user_id: props.member.id,
        organization_id: employee.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role: {
          select: {
            id: true,
            rolePermissions: {
              select: {
                permission: true,
              },
            },
          },
        },
      },
    },
  );
  if (!memberEmployee) {
    throw new HttpException("Forbidden", 403);
  }
  // Check employee:manage permission
  const hasManagePermission =
    memberEmployee.role?.rolePermissions?.some(
      (rp: { permission: string }) => rp.permission === "employee:manage",
    ) ?? false;
  if (!hasManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate role_id if provided
  if (props.body.role_id !== undefined) {
    const roleExists = await MyGlobal.prisma.hrm_platform_roles.findFirst({
      where: {
        id: props.body.role_id,
        organization_id: employee.organization_id,
        deleted_at: null,
      },
    });
    if (!roleExists) {
      throw new HttpException("Invalid role_id", 400);
    }
  }
  // Validate department_id if provided (can be null to remove association)
  if (
    props.body.department_id !== undefined &&
    props.body.department_id !== null
  ) {
    const departmentExists =
      await MyGlobal.prisma.hrm_platform_departments.findFirst({
        where: {
          id: props.body.department_id,
          organization_id: employee.organization_id,
          deleted_at: null,
        },
      });
    if (!departmentExists) {
      throw new HttpException("Invalid department_id", 400);
    }
  }
  // Validate employment_type if provided
  if (props.body.employment_type !== undefined) {
    const validEmploymentTypes = [
      "full-time",
      "part-time",
      "contractor",
      "intern",
    ];
    if (!validEmploymentTypes.includes(props.body.employment_type)) {
      throw new HttpException("Invalid employment_type", 400);
    }
  }
  // Validate status if provided
  if (props.body.status !== undefined) {
    const validStatuses = ["active", "deactivated"];
    if (!validStatuses.includes(props.body.status)) {
      throw new HttpException("Invalid status", 400);
    }
  }
  // Build update data object with only provided fields
  const updateData: Prisma.hrm_platform_employeesUpdateInput = {
    ...(props.body.role_id !== undefined && {
      role: { connect: { id: props.body.role_id } },
    }),
    ...(props.body.department_id !== undefined && {
      department:
        props.body.department_id === null
          ? { disconnect: true }
          : { connect: { id: props.body.department_id } },
    }),
    ...(props.body.position !== undefined && { position: props.body.position }),
    ...(props.body.employment_type !== undefined && {
      employment_type: props.body.employment_type,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    updated_at: new Date(),
  };
  // Perform the update
  await MyGlobal.prisma.hrm_platform_employees.update({
    where: { id: props.employeeId },
    data: updateData,
  });
  // Fetch and return the updated employee
  const updated =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      ...HrmPlatformEmployeeTransformer.select(),
    });
  return await HrmPlatformEmployeeTransformer.transform(updated);
}

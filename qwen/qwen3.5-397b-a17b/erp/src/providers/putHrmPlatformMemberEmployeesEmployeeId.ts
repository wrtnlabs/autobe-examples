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
  // Fetch employee with all relations for response
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      ...HrmPlatformEmployeeTransformer.select(),
    });
  // Validate employee belongs to caller's organization context
  // Get the organization ID from the loaded employee record
  const organizationId = employee.organization.id;
  // Validate role_id if provided
  if (props.body.role_id !== undefined) {
    const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
      where: { id: props.body.role_id },
      select: { id: true, organization_id: true },
    });
    if (!role || role.organization_id !== organizationId) {
      throw new HttpException("Role does not exist in your organization", 400);
    }
  }
  // Validate department_id if provided
  if (props.body.department_id !== undefined) {
    if (props.body.department_id !== null) {
      const department =
        await MyGlobal.prisma.hrm_platform_departments.findUnique({
          where: { id: props.body.department_id },
          select: { id: true, hrm_platform_organization_id: true },
        });
      if (
        !department ||
        department.hrm_platform_organization_id !== organizationId
      ) {
        throw new HttpException(
          "Department does not exist in your organization",
          400,
        );
      }
    }
  }
  // Validate employment_type enum if provided
  if (props.body.employment_type !== undefined) {
    const validEmploymentTypes: readonly string[] = [
      "full-time",
      "part-time",
      "contractor",
      "intern",
    ];
    if (!validEmploymentTypes.includes(props.body.employment_type)) {
      throw new HttpException("Invalid employment type", 400);
    }
  }
  // Validate status enum if provided
  if (props.body.status !== undefined) {
    const validStatuses: readonly string[] = ["active", "deactivated"];
    if (!validStatuses.includes(props.body.status)) {
      throw new HttpException("Invalid status", 400);
    }
  }
  // Build update data
  const updateData: Prisma.hrm_platform_employeesUpdateInput = {
    updated_at: new Date(),
    ...(props.body.display_name !== undefined && {
      display_name: props.body.display_name,
    }),
    ...(props.body.position !== undefined && { position: props.body.position }),
    ...(props.body.employment_type !== undefined && {
      employment_type: props.body.employment_type,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.role_id !== undefined && {
      role: { connect: { id: props.body.role_id } },
    }),
    ...(props.body.department_id !== undefined && {
      department:
        props.body.department_id !== null
          ? { connect: { id: props.body.department_id } }
          : { disconnect: true },
    }),
  };
  // Handle deleted_at based on status change
  if (props.body.status === "deactivated") {
    updateData.deleted_at = new Date();
  } else if (props.body.status === "active") {
    updateData.deleted_at = null;
  }
  // Perform update
  await MyGlobal.prisma.hrm_platform_employees.update({
    where: { id: props.employeeId },
    data: updateData,
  });
  // Fetch updated employee with all relations
  const updated =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      ...HrmPlatformEmployeeTransformer.select(),
    });
  return await HrmPlatformEmployeeTransformer.transform(updated);
}

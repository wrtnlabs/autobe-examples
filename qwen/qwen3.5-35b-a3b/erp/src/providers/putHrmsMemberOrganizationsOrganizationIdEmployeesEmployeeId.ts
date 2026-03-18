import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsEmployeeTransformer } from "../transformers/HrmsEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmsMemberOrganizationsOrganizationIdEmployeesEmployeeId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmsEmployee.IUpdate;
}): Promise<IHrmsEmployee> {
  const employee = await MyGlobal.prisma.hrms_employees.findUniqueOrThrow({
    where: { id: props.employeeId },
    select: {
      id: true,
      organization_member_id: true,
      role_id: true,
      department_id: true,
      organizationMember: {
        select: {
          hrms_organization_id: true,
        },
      },
    },
  });
  if (
    employee.organizationMember.hrms_organization_id !== props.organizationId
  ) {
    throw new HttpException("Employee does not belong to organization", 403);
  }
  const memberMembership =
    await MyGlobal.prisma.hrms_organization_members.findFirstOrThrow({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: props.organizationId,
      },
      include: {
        organizationRole: true,
      },
    });
  const memberRole = memberMembership.organizationRole;
  const hasManagePermission =
    await MyGlobal.prisma.hrms_organization_role_permissions.findFirst({
      where: {
        hrms_organization_role_id: memberRole.id,
        permission: "employee:manage",
      },
    });
  if (!hasManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    props.body.department_id !== undefined &&
    props.body.department_id !== null
  ) {
    const department = await MyGlobal.prisma.hrms_departments.findFirst({
      where: {
        id: props.body.department_id,
        organization_id: props.organizationId,
      },
    });
    if (!department) {
      throw new HttpException("Department not found in organization", 400);
    }
  }
  if (props.body.role_id !== undefined && props.body.role_id !== null) {
    const role = await MyGlobal.prisma.hrms_organization_roles.findFirst({
      where: {
        id: props.body.role_id,
        organization_id: props.organizationId,
      },
    });
    if (!role) {
      throw new HttpException("Role not found in organization", 400);
    }
  }
  const updateData: Prisma.hrms_employeesUpdateInput = {
    ...(props.body.display_name !== undefined && {
      display_name: props.body.display_name,
    }),
    ...(props.body.position !== undefined && {
      position: props.body.position,
    }),
    ...(props.body.employment_type !== undefined && {
      employment_type: props.body.employment_type,
    }),
    ...(props.body.department_id !== undefined && {
      department_id: props.body.department_id,
    }),
    ...(props.body.role_id !== undefined && {
      role_id: props.body.role_id,
    }),
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    updated_at: new Date(),
  };
  await MyGlobal.prisma.hrms_employees.update({
    where: { id: props.employeeId },
    data: updateData,
  });
  const updated = await MyGlobal.prisma.hrms_employees.findUniqueOrThrow({
    where: { id: props.employeeId },
    ...HrmsEmployeeTransformer.select(),
  });
  return await HrmsEmployeeTransformer.transform(updated);
}

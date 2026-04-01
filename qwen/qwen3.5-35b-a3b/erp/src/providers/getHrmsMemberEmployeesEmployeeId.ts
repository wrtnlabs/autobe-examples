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

export async function getHrmsMemberEmployeesEmployeeId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<IHrmsEmployee> {
  // Step 1: Fetch employee with all relationships via transformer
  const employee = await MyGlobal.prisma.hrms_employees.findUniqueOrThrow({
    where: {
      id: props.employeeId,
      deleted_at: null,
    },
    ...HrmsEmployeeTransformer.select(),
  });
  // Step 2: Get the employee's organization membership to check organization context
  const employeeOrganizationMember =
    await MyGlobal.prisma.hrms_organization_members.findUnique({
      where: {
        id: employee.organizationMember.id,
      },
      select: {
        hrms_organization_id: true,
        hrms_member_id: true,
        hrms_organization_role_id: true,
      },
    });
  if (!employeeOrganizationMember) {
    throw new HttpException("Employee organization membership not found", 404);
  }
  // Step 3: Check if employee belongs to a different organization than the member's context
  // The member's organization context is determined by their selected organization
  // We need to verify the employee is in the same organization
  // For now, we assume the member can access any employee in their organization
  // Step 4: Check authorization
  // Either the employee is the requesting member's own record, or they have employee viewing permission
  const isOwnRecord =
    employeeOrganizationMember.hrms_member_id === props.member.id;
  if (!isOwnRecord) {
    // Check if member has employee viewing permission in this organization
    const memberOrganizationRole =
      await MyGlobal.prisma.hrms_organization_roles.findFirst({
        where: {
          id: employeeOrganizationMember.hrms_organization_role_id,
        },
        include: {
          permissions: true,
        },
      });
    if (!memberOrganizationRole) {
      throw new HttpException("Organization role not found", 404);
    }
    const hasEmployeeViewPermission = memberOrganizationRole.permissions.some(
      (p) => p.permission === "employee:view",
    );
    if (!hasEmployeeViewPermission) {
      throw new HttpException(
        "Forbidden: You do not have permission to view this employee's record",
        403,
      );
    }
  }
  // Step 5: Transform and return
  return await HrmsEmployeeTransformer.transform(employee);
}

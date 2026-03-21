import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmEmployeeTransformer } from "../transformers/ErpHrmEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberEmployeesEmployeeId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<IErpHrmEmployee> {
  // 1. Verify session belongs to the requesting member
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_member_id: true },
    });
  if (session.erp_hrm_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Get member's organization via their employee record
  const memberEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
      erp_hrm_organization_id: true,
    },
  });
  if (!memberEmployee) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Check if member has employee:view permission
  const rolePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: memberEmployee.erp_hrm_role_id,
        permission: "employee:view",
      },
      select: { id: true },
    });
  if (!rolePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Query employee by ID with all relations using transformer
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: { id: props.employeeId },
    ...ErpHrmEmployeeTransformer.select(),
  });
  // 5. Verify employee belongs to the current organization
  if (employee.organization.id !== memberEmployee.erp_hrm_organization_id) {
    throw new HttpException("Not Found", 404);
  }
  // 6. Verify employee is not soft-deleted
  if (employee.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // 7. Transform and return
  return await ErpHrmEmployeeTransformer.transform(employee);
}

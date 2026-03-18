import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsEmployeeContractTransformer } from "../transformers/HrmsEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmsMemberEmployeesEmployeeIdContractsContractId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
}): Promise<IHrmsEmployeeContract> {
  const contract =
    await MyGlobal.prisma.hrms_employee_contracts.findUniqueOrThrow({
      where: {
        id: props.contractId,
        hrms_employee_id: props.employeeId,
        deleted_at: null,
      },
      ...HrmsEmployeeContractTransformer.select(),
    });
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      id: contract.employee.id,
      deleted_at: null,
    },
    select: {
      organization_member_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Not found", 404);
  }
  const employeeOrgMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: { id: employee.organization_member_id },
    });
  if (!employeeOrgMember) {
    throw new HttpException("Forbidden", 403);
  }
  const memberOrgMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: employeeOrgMember.hrms_organization_id,
      },
    });
  if (!memberOrgMember) {
    throw new HttpException("Forbidden", 403);
  }
  const isEmployee = props.member.id === contract.employee.id;
  const hasPermission = await checkEmployeeViewPermission({
    memberId: props.member.id,
    role: memberOrgMember,
  });
  if (isEmployee || hasPermission) {
    return await HrmsEmployeeContractTransformer.transform(contract);
  }
  throw new HttpException("Forbidden", 403);
}
async function checkEmployeeViewPermission(props: {
  memberId: string & tags.Format<"uuid">;
  role: {
    hrms_organization_role_id: string & tags.Format<"uuid">;
  };
}): Promise<boolean> {
  const permission =
    await MyGlobal.prisma.hrms_organization_role_permissions.findFirst({
      where: {
        hrms_organization_role_id: props.role.hrms_organization_role_id,
        permission: "employee:view",
      },
    });
  return permission !== null;
}

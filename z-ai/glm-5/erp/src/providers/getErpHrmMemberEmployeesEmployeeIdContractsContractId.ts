import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmContractTransformer } from "../transformers/ErpHrmContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberEmployeesEmployeeIdContractsContractId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
}): Promise<IErpHrmContract> {
  // Get session to find organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization context selected", 400);
  }
  // Verify employee exists and belongs to the organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: { id: props.employeeId },
    select: {
      id: true,
      erp_hrm_member_id: true,
      erp_hrm_organization_id: true,
      erp_hrm_role_id: true,
    },
  });
  if (employee.erp_hrm_organization_id !== session.erp_hrm_organization_id) {
    throw new HttpException("Employee not found in current organization", 404);
  }
  // Check permission: own contracts OR employee:view permission
  const isOwnContract = employee.erp_hrm_member_id === props.member.id;
  if (!isOwnContract) {
    // Check if member has employee:view permission in this organization
    const memberEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
      where: {
        erp_hrm_member_id: props.member.id,
        erp_hrm_organization_id: session.erp_hrm_organization_id,
        deleted_at: null,
      },
      select: { erp_hrm_role_id: true },
    });
    if (!memberEmployee) {
      throw new HttpException("Forbidden", 403);
    }
    const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst(
      {
        where: {
          erp_hrm_role_id: memberEmployee.erp_hrm_role_id,
          permission: "employee:view",
        },
      },
    );
    if (!permission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Get the contract using transformer
  const contract = await MyGlobal.prisma.erp_hrm_contracts.findFirstOrThrow({
    where: {
      id: props.contractId,
      erp_hrm_employee_id: props.employeeId,
      deleted_at: null,
    },
    ...ErpHrmContractTransformer.select(),
  });
  return await ErpHrmContractTransformer.transform(contract);
}

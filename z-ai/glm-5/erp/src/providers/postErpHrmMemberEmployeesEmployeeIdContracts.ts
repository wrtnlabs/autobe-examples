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
import { ErpHrmContractCollector } from "../collectors/ErpHrmContractCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmContractTransformer } from "../transformers/ErpHrmContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IErpHrmContract.ICreate;
}): Promise<IErpHrmContract> {
  // 1. Get session to find current organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: {
        erp_hrm_organization_id: true,
      },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization selected", 400);
  }
  // 2. Verify employee exists and belongs to the organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUnique({
    where: { id: props.employeeId },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  if (employee.erp_hrm_organization_id !== session.erp_hrm_organization_id) {
    throw new HttpException("Employee not found in organization", 404);
  }
  // 3. Get member's employee record and check permission
  const memberEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: {
      erp_hrm_role_id: true,
    },
  });
  if (!memberEmployee) {
    throw new HttpException("Forbidden", 403);
  }
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
    where: {
      erp_hrm_role_id: memberEmployee.erp_hrm_role_id,
      permission: "employee:manage",
    },
  });
  if (!permission) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Check for existing active contract and end it
  const startDate = new Date(props.body.start_date);
  const existingActiveContract =
    await MyGlobal.prisma.erp_hrm_contracts.findFirst({
      where: {
        erp_hrm_employee_id: props.employeeId,
        start_date: { lte: new Date() },
        OR: [{ end_date: null }, { end_date: { gt: new Date() } }],
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingActiveContract) {
    const newEndDate = new Date(startDate);
    newEndDate.setDate(newEndDate.getDate() - 1);
    await MyGlobal.prisma.erp_hrm_contracts.update({
      where: { id: existingActiveContract.id },
      data: {
        end_date: newEndDate,
        updated_at: new Date(),
      },
    });
  }
  // 5. Create the new contract using collector
  const contractData = await ErpHrmContractCollector.collect({
    body: props.body,
    erpHrmEmployees: { id: props.employeeId },
  });
  const created = await MyGlobal.prisma.erp_hrm_contracts.create({
    data: contractData,
    ...ErpHrmContractTransformer.select(),
  });
  // 6. Return transformed result
  return await ErpHrmContractTransformer.transform(created);
}

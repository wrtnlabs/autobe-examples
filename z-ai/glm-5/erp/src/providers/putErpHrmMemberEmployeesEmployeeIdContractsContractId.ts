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

export async function putErpHrmMemberEmployeesEmployeeIdContractsContractId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
  body: IErpHrmContract.IUpdate;
}): Promise<IErpHrmContract> {
  // Get session to determine organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: {
        erp_hrm_organization_id: true,
      },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization context selected", 400);
  }
  // Get current member's employee record with role permissions
  const currentEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      role: {
        select: {
          permissions: {
            select: { permission: true },
          },
        },
      },
    },
  });
  if (currentEmployee === null) {
    throw new HttpException("Employee record not found in organization", 403);
  }
  // Check for employee:manage permission
  const hasPermission = currentEmployee.role.permissions.some(
    (p) => p.permission === "employee:manage",
  );
  if (!hasPermission) {
    throw new HttpException(
      "Forbidden - employee:manage permission required",
      403,
    );
  }
  // Get target employee and verify belongs to same organization
  const targetEmployee = await MyGlobal.prisma.erp_hrm_employees.findUnique({
    where: { id: props.employeeId },
    select: {
      id: true,
      erp_hrm_member_id: true,
      erp_hrm_organization_id: true,
    },
  });
  if (targetEmployee === null) {
    throw new HttpException("Employee not found", 404);
  }
  if (
    targetEmployee.erp_hrm_organization_id !== session.erp_hrm_organization_id
  ) {
    throw new HttpException("Employee not found in organization", 404);
  }
  // Prevent employees from editing their own contracts
  if (targetEmployee.erp_hrm_member_id === props.member.id) {
    throw new HttpException("Cannot edit own contract", 403);
  }
  // Get the contract and verify it belongs to the employee and is active
  const contract = await MyGlobal.prisma.erp_hrm_contracts.findUnique({
    where: { id: props.contractId },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      start_date: true,
      end_date: true,
      deleted_at: true,
    },
  });
  if (contract === null) {
    throw new HttpException("Contract not found", 404);
  }
  if (contract.erp_hrm_employee_id !== props.employeeId) {
    throw new HttpException("Contract does not belong to this employee", 404);
  }
  if (contract.deleted_at !== null) {
    throw new HttpException("Contract not found", 404);
  }
  // Check if contract is active (editable)
  const now = new Date();
  const isActive =
    contract.start_date <= now &&
    (contract.end_date === null || contract.end_date > now);
  if (!isActive) {
    throw new HttpException("Contract is historical and cannot be edited", 409);
  }
  // Update the contract
  const updated = await MyGlobal.prisma.erp_hrm_contracts.update({
    where: { id: props.contractId },
    data: {
      ...(props.body.end_date !== undefined && {
        end_date:
          props.body.end_date !== null ? new Date(props.body.end_date) : null,
      }),
      ...(props.body.pay_rate !== undefined && {
        pay_rate: props.body.pay_rate,
      }),
      ...(props.body.pay_period !== undefined && {
        pay_period: props.body.pay_period,
      }),
      ...(props.body.working_hours_per_week !== undefined && {
        working_hours_per_week: props.body.working_hours_per_week,
      }),
      ...(props.body.notes !== undefined && { notes: props.body.notes }),
      updated_at: new Date(),
    },
    ...ErpHrmContractTransformer.select(),
  });
  return await ErpHrmContractTransformer.transform(updated);
}

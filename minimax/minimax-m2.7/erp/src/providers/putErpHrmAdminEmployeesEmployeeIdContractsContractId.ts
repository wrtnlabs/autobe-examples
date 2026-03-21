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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmContractTransformer } from "../transformers/ErpHrmContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmAdminEmployeesEmployeeIdContractsContractId(props: {
  admin: AdminPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
  body: IErpHrmContract.IUpdate;
}): Promise<IErpHrmContract> {
  // Query the employee to verify existence and get organization context
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: { id: props.employeeId },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      erp_hrm_role_id: true,
      role: {
        select: {
          id: true,
          name: true,
          is_builtin: true,
        },
      },
    },
  });
  // Verify the admin has employee:manage permission
  // Check if admin is Owner or Manager of the organization (built-in roles)
  const isOwner = employee.role.is_builtin && employee.role.name === "Owner";
  const isManager =
    employee.role.is_builtin && employee.role.name === "Manager";
  if (!isOwner && !isManager) {
    // Check if the admin has custom employee:manage permission
    // First, find the admin's employee record in the same organization
    const adminEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
      where: {
        erp_hrm_member_id: props.admin.id,
        erp_hrm_organization_id: employee.erp_hrm_organization_id,
      },
      select: {
        id: true,
        erp_hrm_role_id: true,
      },
    });
    if (!adminEmployee) {
      throw new HttpException("Forbidden", 403);
    }
    // Check if the admin's role has employee:manage permission
    const adminHasPermission =
      await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
        where: {
          erp_hrm_role_id: adminEmployee.erp_hrm_role_id,
          permission: "employee:manage",
        },
      });
    if (!adminHasPermission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Query the contract to verify it exists and belongs to the employee
  const existingContract =
    await MyGlobal.prisma.erp_hrm_contracts.findUniqueOrThrow({
      where: { id: props.contractId },
      select: {
        id: true,
        erp_hrm_employee_id: true,
        start_date: true,
        end_date: true,
      },
    });
  // Validate the contract belongs to the specified employee
  if (existingContract.erp_hrm_employee_id !== props.employeeId) {
    throw new HttpException("Contract not found", 404);
  }
  // Check if the contract is historical (end_date in the past)
  const now = new Date();
  if (existingContract.end_date && existingContract.end_date < now) {
    throw new HttpException(
      "Cannot modify historical contracts that have ended",
      400,
    );
  }
  // start_date cannot be updated via IUpdate, so always use existing contract's start_date
  const newStartDate = existingContract.start_date;
  // Check for overlapping date ranges if end_date is being updated
  const newEndDate =
    props.body.end_date === null
      ? null
      : props.body.end_date !== undefined
        ? new Date(props.body.end_date)
        : existingContract.end_date;
  // Query other contracts for the same employee to check for overlaps
  const otherContracts = await MyGlobal.prisma.erp_hrm_contracts.findMany({
    where: {
      erp_hrm_employee_id: props.employeeId,
      id: { not: props.contractId },
    },
    select: {
      id: true,
      start_date: true,
      end_date: true,
    },
  });
  // Check for overlaps with other contracts
  const hasOverlap = otherContracts.some((contract) => {
    const otherStart = contract.start_date;
    const otherEnd = contract.end_date;
    // Overlap exists if:
    // - new contract starts before other ends (or other has no end) AND
    // - new contract ends after other starts (or new has no end)
    const otherEndDate = otherEnd ?? new Date("9999-12-31");
    const newEndDateCheck = newEndDate ?? new Date("9999-12-31");
    return newStartDate <= otherEndDate && newEndDateCheck >= otherStart;
  });
  if (hasOverlap) {
    throw new HttpException(
      "Contract date range overlaps with existing contracts",
      400,
    );
  }
  // Apply partial updates to the contract
  const updatedContract = await MyGlobal.prisma.erp_hrm_contracts.update({
    where: { id: props.contractId },
    data: {
      ...(props.body.pay_rate !== undefined && {
        pay_rate: props.body.pay_rate,
      }),
      ...(props.body.pay_period !== undefined && {
        pay_period: props.body.pay_period,
      }),
      ...(props.body.working_hours_per_week !== undefined && {
        working_hours_per_week: props.body.working_hours_per_week,
      }),
      ...(props.body.end_date !== undefined && {
        end_date:
          props.body.end_date === null
            ? null
            : props.body.end_date
              ? new Date(props.body.end_date)
              : undefined,
      }),
      ...(props.body.notes !== undefined && {
        notes: props.body.notes === null ? null : props.body.notes,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch the complete contract with all relations for response
  const contractWithRelations =
    await MyGlobal.prisma.erp_hrm_contracts.findUniqueOrThrow({
      where: { id: props.contractId },
      ...ErpHrmContractTransformer.select(),
    });
  return await ErpHrmContractTransformer.transform(contractWithRelations);
}

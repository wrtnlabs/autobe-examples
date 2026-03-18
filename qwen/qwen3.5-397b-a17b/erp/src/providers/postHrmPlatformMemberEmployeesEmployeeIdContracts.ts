import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformEmployeeContractCollector } from "../collectors/HrmPlatformEmployeeContractCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeContractTransformer } from "../transformers/HrmPlatformEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmPlatformEmployeeContract.ICreate;
}): Promise<IHrmPlatformEmployeeContract> {
  // Verify employee exists and get organization for permission check
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      select: { id: true, organization_id: true, status: true },
    });
  // Verify employee is active
  if (employee.status !== "active") {
    throw new HttpException("Employee is not active", 400);
  }
  // Check permission: member must have employee:manage permission in the organization
  const employeeRecord = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        member_id: props.member.id,
        organization_id: employee.organization_id,
      },
      select: {
        role: {
          select: {
            permissions: {
              select: { permission: true },
            },
          },
        },
      },
    },
  );
  if (!employeeRecord) {
    throw new HttpException(
      "Member is not an employee of this organization",
      403,
    );
  }
  const hasManagePermission = employeeRecord.role.permissions.some(
    (p: { permission: string }) => p.permission === "employee:manage",
  );
  if (!hasManagePermission) {
    throw new HttpException(
      "Forbidden: employee:manage permission required",
      403,
    );
  }
  // Validate pay_period
  const allowedPayPeriods = ["hourly", "daily", "weekly", "monthly"];
  if (!allowedPayPeriods.includes(props.body.pay_period)) {
    throw new HttpException(
      `Invalid pay_period. Must be one of: ${allowedPayPeriods.join(", ")}`,
      400,
    );
  }
  // Validate positive values
  if (props.body.pay_rate <= 0) {
    throw new HttpException("pay_rate must be a positive number", 400);
  }
  if (props.body.working_hours_per_week <= 0) {
    throw new HttpException(
      "working_hours_per_week must be a positive integer",
      400,
    );
  }
  // Calculate previous contract end date (one day before start_date)
  // Parse the ISO string, subtract one day, and convert back to ISO string
  const startDate = new Date(props.body.start_date);
  const previousEndDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
  const previousEndDateStr = toISOStringSafe(previousEndDate);
  // Transaction to handle contract lifecycle
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    // Find and end any existing active contract
    const activeContract = await tx.hrm_platform_employee_contracts.findFirst({
      where: {
        hrm_platform_employee_id: props.employeeId,
        end_date: null,
        deleted_at: null,
      },
    });
    if (activeContract) {
      await tx.hrm_platform_employee_contracts.update({
        where: { id: activeContract.id },
        data: {
          end_date: previousEndDateStr,
          updated_at: toISOStringSafe(new Date()),
        },
      });
    }
    // Create new contract using collector
    return await tx.hrm_platform_employee_contracts.create({
      data: await HrmPlatformEmployeeContractCollector.collect({
        body: props.body,
        hrmPlatformEmployees: { id: props.employeeId },
      }),
      ...HrmPlatformEmployeeContractTransformer.select(),
    });
  });
  return await HrmPlatformEmployeeContractTransformer.transform(created);
}

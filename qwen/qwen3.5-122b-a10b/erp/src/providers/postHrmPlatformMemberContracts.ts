import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformContractCollector } from "../collectors/HrmPlatformContractCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformContractTransformer } from "../transformers/HrmPlatformContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberContracts(props: {
  member: MemberPayload;
  body: IHrmPlatformContract.ICreate;
}): Promise<IHrmPlatformContract> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Verify employee exists and belongs to current organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findUnique({
    where: { id: props.body.employee_id },
    select: { id: true, hrm_platform_organization_id: true, deleted_at: true },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  if (employee.deleted_at !== null) {
    throw new HttpException("Employee has been deactivated", 400);
  }
  // Verify member has employee:manage permission for the employee's organization
  const memberInOrg = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      hrm_platform_organization_id: employee.hrm_platform_organization_id,
      deleted_at: null,
    },
    select: { hrm_platform_role_id: true },
  });
  if (memberInOrg === null) {
    throw new HttpException(
      "Member does not belong to the employee's organization",
      403,
    );
  }
  // Check if member has employee:manage permission via role
  const rolePermissions =
    await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
      where: { hrm_platform_role_id: memberInOrg.hrm_platform_role_id },
      select: { permission: { select: { name: true } } },
    });
  const hasEmployeeManagePermission = rolePermissions.some(
    (rp) => rp.permission.name === "employee:manage",
  );
  if (!hasEmployeeManagePermission) {
    throw new HttpException(
      "Forbidden: employee:manage permission required",
      403,
    );
  }
  // Check for existing active contract
  const existingActiveContract =
    await MyGlobal.prisma.hrm_platform_contracts.findFirst({
      where: {
        hrm_platform_employee_id: props.body.employee_id,
        end_date: null,
        deleted_at: null,
      },
      select: { id: true, start_date: true },
    });
  // Parse dates for comparison (local Date objects only for comparison logic)
  const newStartDate = new Date(props.body.start_date);
  const nowDate = new Date();
  // Validate start_date is not in the future
  if (newStartDate > nowDate) {
    throw new HttpException("Start date cannot be in the future", 400);
  }
  // Validate pay_rate is positive
  if (props.body.pay_rate <= 0) {
    throw new HttpException("Pay rate must be positive", 400);
  }
  // Validate pay_period
  const validPayPeriods = ["hourly", "daily", "weekly", "monthly"];
  if (!validPayPeriods.includes(props.body.pay_period)) {
    throw new HttpException(
      "Invalid pay period. Must be one of: hourly, daily, weekly, monthly",
      400,
    );
  }
  // Validate working_hours_per_week is positive
  if (props.body.working_hours_per_week <= 0) {
    throw new HttpException("Working hours per week must be positive", 400);
  }
  // Check for overlapping contracts
  if (existingActiveContract) {
    const existingStartDate = new Date(existingActiveContract.start_date);
    if (newStartDate < existingStartDate) {
      throw new HttpException(
        "New contract start date cannot be before existing active contract start date",
        400,
      );
    }
  }
  // Create contract with snapshot and activity log in transaction
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Terminate existing active contract if exists
    if (existingActiveContract) {
      const endDate = new Date(props.body.start_date);
      endDate.setDate(endDate.getDate() - 1);
      await tx.hrm_platform_contracts.update({
        where: { id: existingActiveContract.id },
        data: {
          end_date: endDate,
          updated_at: new Date(),
        },
      });
    }
    // Create new contract using collector
    const contractData = await HrmPlatformContractCollector.collect({
      body: props.body,
    });
    const created = await tx.hrm_platform_contracts.create({
      data: {
        ...contractData,
        updated_at: new Date(),
      },
      ...HrmPlatformContractTransformer.select(),
    });
    // Create snapshot
    await tx.hrm_platform_contract_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        hrm_platform_contract_id: created.id,
        start_date: created.start_date,
        end_date: created.end_date,
        pay_rate: created.pay_rate,
        pay_period: created.pay_period,
        working_hours_per_week: created.working_hours_per_week,
        notes: created.notes,
        created_at: new Date(),
      },
    });
    // Create activity log - use correct field names from schema
    await tx.hrm_platform_activity_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        user_id: props.member.id,
        organization_id: employee.hrm_platform_organization_id,
        action_type: "contract.created",
        target_entity: "contract",
        target_id: created.id,
        details: JSON.stringify({
          employee_id: props.body.employee_id,
          start_date: props.body.start_date,
          pay_rate: props.body.pay_rate,
        }),
        created_at: new Date(),
      },
    });
    return created;
  });
  return await HrmPlatformContractTransformer.transform(result);
}

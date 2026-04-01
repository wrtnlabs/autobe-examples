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

export async function postHrmPlatformMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmPlatformContract.ICreate;
}): Promise<IHrmPlatformContract> {
  // Step 1: Fetch employee with organization relation
  const employee = await MyGlobal.prisma.hrm_platform_employees.findUnique({
    where: { id: props.employeeId },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      hrm_platform_role_id: true,
      status: true,
      deleted_at: true,
    },
  });
  if (employee === null || employee.deleted_at !== null) {
    throw new HttpException("Employee not found", 404);
  }
  if (employee.status !== "active") {
    throw new HttpException(
      "Cannot create contract for inactive employee",
      400,
    );
  }
  // Step 2: Verify member has employee:manage permission
  const roleWithPermission = await MyGlobal.prisma.hrm_platform_roles.findFirst(
    {
      where: {
        id: employee.hrm_platform_role_id,
        hrm_platform_organization_id: employee.hrm_platform_organization_id,
        deleted_at: null,
        permissions: {
          some: {
            permission: {
              code: "employee:manage",
              deleted_at: null,
            },
          },
        },
      },
    },
  );
  if (roleWithPermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Validate start_date is not in the past
  const startDate = new Date(props.body.start_date);
  const now = new Date();
  if (startDate < now) {
    throw new HttpException("Start date cannot be in the past", 400);
  }
  // Step 4: Validate pay_rate and working_hours_per_week
  if (props.body.pay_rate <= 0) {
    throw new HttpException("Pay rate must be positive", 400);
  }
  if (props.body.working_hours_per_week <= 0) {
    throw new HttpException("Working hours must be positive", 400);
  }
  // Step 5: Validate pay_period enum
  const validPayPeriods = ["hourly", "daily", "weekly", "monthly"];
  if (!validPayPeriods.includes(props.body.pay_period)) {
    throw new HttpException("Invalid pay period", 400);
  }
  // Step 6: Check for existing active contract and handle within transaction
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Find existing active contract
    const existingActiveContract = await tx.hrm_platform_contracts.findFirst({
      where: {
        hrm_platform_employee_id: props.employeeId,
        end_date: null,
        deleted_at: null,
      },
    });
    // If exists, end it one day before new contract starts
    if (existingActiveContract !== null) {
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() - 1);
      await tx.hrm_platform_contracts.update({
        where: { id: existingActiveContract.id },
        data: {
          end_date: endDate,
          updated_at: new Date(),
        },
      });
    }
    // Create new contract using collector data directly
    const contractData = await HrmPlatformContractCollector.collect({
      body: props.body,
    });
    const created = await tx.hrm_platform_contracts.create({
      data: contractData,
      ...HrmPlatformContractTransformer.select(),
    });
    return created;
  });
  // Step 7: Transform and return
  return await HrmPlatformContractTransformer.transform(result);
}

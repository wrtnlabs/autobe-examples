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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformContractTransformer } from "../transformers/HrmPlatformContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberContractsContractId(props: {
  member: MemberPayload;
  contractId: string & tags.Format<"uuid">;
  body: IHrmPlatformContract.IUpdate;
}): Promise<IHrmPlatformContract> {
  // Retrieve contract with employee relation to verify organization context
  const contract =
    await MyGlobal.prisma.hrm_platform_contracts.findUniqueOrThrow({
      where: { id: props.contractId },
      select: {
        id: true,
        hrm_platform_employee_id: true,
        start_date: true,
        end_date: true,
        pay_rate: true,
        pay_period: true,
        working_hours_per_week: true,
        notes: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: {
          select: {
            id: true,
            hrm_platform_organization_id: true,
            hrm_platform_user_id: true,
          } satisfies Prisma.hrm_platform_employeesSelect,
        },
      } satisfies Prisma.hrm_platform_contractsSelect,
    });
  // Check if contract is editable (active contract has null end_date)
  if (contract.end_date !== null) {
    throw new HttpException("Contract is terminated and cannot be edited", 400);
  }
  // Verify member is an employee in the same organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_organization_id:
        contract.employee.hrm_platform_organization_id,
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_role_id: true,
    } satisfies Prisma.hrm_platform_employeesSelect,
  });
  if (employee === null) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // Verify employee:manage permission through role
  const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: { id: employee.hrm_platform_role_id },
    select: {
      id: true,
      hrm_platform_organization_id: true,
    } satisfies Prisma.hrm_platform_rolesSelect,
  });
  if (role === null) {
    throw new HttpException("Role not found", 403);
  }
  // Check if role has employee:manage permission
  const hasPermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: role.id,
        permission: {
          code: "employee:manage",
        },
      },
    });
  if (hasPermission === null) {
    throw new HttpException(
      "You do not have permission to edit contracts",
      403,
    );
  }
  // Build update data with optional fields
  const updateData: Prisma.hrm_platform_contractsUpdateInput = {
    ...(props.body.endDate !== undefined && {
      end_date:
        props.body.endDate !== null ? new Date(props.body.endDate) : null,
    }),
    ...(props.body.payRate !== undefined && {
      pay_rate: props.body.payRate,
    }),
    ...(props.body.payPeriod !== undefined && {
      pay_period: props.body.payPeriod,
    }),
    ...(props.body.workingHoursPerWeek !== undefined && {
      working_hours_per_week: props.body.workingHoursPerWeek,
    }),
    ...(props.body.notes !== undefined && {
      notes: props.body.notes,
    }),
    updated_at: new Date(),
  };
  // Update the contract
  await MyGlobal.prisma.hrm_platform_contracts.update({
    where: { id: props.contractId },
    data: updateData,
  });
  // Retrieve updated contract with full data for transformation
  const updated =
    await MyGlobal.prisma.hrm_platform_contracts.findUniqueOrThrow({
      where: { id: props.contractId },
      ...HrmPlatformContractTransformer.select(),
    });
  return await HrmPlatformContractTransformer.transform(updated);
}

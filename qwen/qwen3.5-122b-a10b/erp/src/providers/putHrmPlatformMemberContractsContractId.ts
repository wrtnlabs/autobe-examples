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
  // Step 1: Retrieve contract with employee relation for organization context
  const contract = await MyGlobal.prisma.hrm_platform_contracts.findUnique({
    where: { id: props.contractId },
    select: {
      id: true,
      end_date: true,
      employee: {
        select: {
          hrm_platform_organization_id: true,
        },
      },
    },
  });
  if (contract === null) {
    throw new HttpException("Contract not found", 404);
  }
  // Step 2: Verify contract is active (editable)
  if (contract.end_date !== null) {
    throw new HttpException("Cannot edit a terminated contract", 400);
  }
  // Step 3: Verify member has employee:manage permission in the contract's organization
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_user_id: props.member.id,
        hrm_platform_organization_id:
          contract.employee.hrm_platform_organization_id,
        deleted_at: null,
      },
      select: {
        role: {
          select: {
            permissions: {
              select: {
                permission: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    },
  );
  if (memberEmployee === null) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  const hasEmployeeManagePermission = memberEmployee.role?.permissions.some(
    (rp) => rp.permission.code === "employee:manage",
  );
  if (!hasEmployeeManagePermission) {
    throw new HttpException(
      "You do not have permission to manage employee contracts",
      403,
    );
  }
  // Step 4: Update the contract with optional fields
  await MyGlobal.prisma.hrm_platform_contracts.update({
    where: { id: props.contractId },
    data: {
      updated_at: new Date(),
      ...(props.body.endDate !== undefined && {
        end_date: props.body.endDate ? new Date(props.body.endDate) : null,
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
    },
  });
  // Step 5: Retrieve and transform the updated contract
  const updated =
    await MyGlobal.prisma.hrm_platform_contracts.findUniqueOrThrow({
      where: { id: props.contractId },
      ...HrmPlatformContractTransformer.select(),
    });
  return await HrmPlatformContractTransformer.transform(updated);
}

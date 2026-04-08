import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
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

export async function postHrmPlatformMemberEmployeeContracts(props: {
  member: MemberPayload;
  body: IHrmPlatformEmployeeContract.ICreate;
}): Promise<IHrmPlatformEmployeeContract> {
  // Get target employee to find their organization
  const targetEmployee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.body.hrm_platform_employee_id },
      select: {
        id: true,
        organization_id: true,
        deleted_at: true,
      },
    });
  if (targetEmployee.deleted_at !== null) {
    throw new HttpException("Employee not found", 404);
  }
  // Get the member's employee record in the same organization
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        member_id: props.member.id,
        organization_id: targetEmployee.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    },
  );
  if (!memberEmployee) {
    throw new HttpException("Member not found in organization", 404);
  }
  // Check role permissions through role_permissions junction table
  const rolePermissions =
    await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
      where: {
        hrm_platform_role_id: memberEmployee.role_id,
      },
      select: {
        permission: {
          select: {
            code: true,
          },
        },
      },
    });
  const hasEmployeeManagePermission = rolePermissions.some(
    (rp: {
      permission: {
        code: string;
      };
    }) => rp.permission.code === "employee:manage",
  );
  if (!hasEmployeeManagePermission) {
    throw new HttpException(
      "Forbidden: employee:manage permission required",
      403,
    );
  }
  // Check for existing active contract
  const activeContract =
    await MyGlobal.prisma.hrm_platform_employee_contracts.findFirst({
      where: {
        hrm_platform_employee_id: props.body.hrm_platform_employee_id,
        end_date: null,
        deleted_at: null,
      },
    });
  // End previous active contract if exists
  if (activeContract) {
    const startDate = new Date(props.body.start_date);
    const previousEndDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    await MyGlobal.prisma.hrm_platform_employee_contracts.update({
      where: { id: activeContract.id },
      data: {
        end_date: previousEndDate,
        updated_at: new Date(),
      },
    });
  }
  // Create new contract using Collector
  const created = await MyGlobal.prisma.hrm_platform_employee_contracts.create({
    data: await HrmPlatformEmployeeContractCollector.collect({
      body: props.body,
    }),
    ...HrmPlatformEmployeeContractTransformer.select(),
  });
  return await HrmPlatformEmployeeContractTransformer.transform(created);
}

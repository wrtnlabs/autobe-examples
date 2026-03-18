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

export async function getHrmPlatformMemberContractsContractId(props: {
  member: MemberPayload;
  contractId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformContract> {
  // Query contract with employee FK fields for authorization check
  const contract =
    await MyGlobal.prisma.hrm_platform_contracts.findUniqueOrThrow({
      where: {
        id: props.contractId,
        deleted_at: null,
      },
      select: {
        id: true,
        start_date: true,
        end_date: true,
        pay_rate: true,
        pay_period: true,
        working_hours_per_week: true,
        notes: true,
        created_at: true,
        updated_at: true,
        hrm_platform_employee_id: true,
      },
    });
  // Get employee record for authorization
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: contract.hrm_platform_employee_id },
      select: {
        hrm_platform_user_id: true,
        hrm_platform_organization_id: true,
      },
    });
  // Authorization check: contract holder access
  const isContractHolder = employee.hrm_platform_user_id === props.member.id;
  if (isContractHolder) {
    // Contract holder can view their own contracts - fetch full contract with employee summary
    const fullContract =
      await MyGlobal.prisma.hrm_platform_contracts.findUniqueOrThrow({
        where: {
          id: props.contractId,
          deleted_at: null,
        },
        select: HrmPlatformContractTransformer.select().select,
      });
    return await HrmPlatformContractTransformer.transform(fullContract);
  }
  // Authorization check: manager/admin access with employee:view permission
  // Check if member has a role in the employee's organization with employee:view permission
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_user_id: props.member.id,
        hrm_platform_organization_id: employee.hrm_platform_organization_id,
        deleted_at: null,
      },
      select: {
        hrm_platform_role_id: true,
      },
    },
  );
  if (!memberEmployee) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if member's role has employee:view permission
  const hasPermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: memberEmployee.hrm_platform_role_id,
        permission: {
          code: "employee:view",
        },
      },
    });
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch full contract with employee summary for response
  const fullContract =
    await MyGlobal.prisma.hrm_platform_contracts.findUniqueOrThrow({
      where: {
        id: props.contractId,
        deleted_at: null,
      },
      select: HrmPlatformContractTransformer.select().select,
    });
  return await HrmPlatformContractTransformer.transform(fullContract);
}

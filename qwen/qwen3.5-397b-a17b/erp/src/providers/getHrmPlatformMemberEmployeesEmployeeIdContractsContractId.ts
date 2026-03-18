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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeContractTransformer } from "../transformers/HrmPlatformEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberEmployeesEmployeeIdContractsContractId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformEmployeeContract> {
  const contract =
    await MyGlobal.prisma.hrm_platform_employee_contracts.findUniqueOrThrow({
      where: {
        id: props.contractId,
        deleted_at: null,
      },
      ...HrmPlatformEmployeeContractTransformer.select(),
    });
  if (contract.employee.id !== props.employeeId) {
    throw new HttpException(
      "Contract does not belong to specified employee",
      400,
    );
  }
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      select: {
        id: true,
        member_id: true,
        organization_id: true,
        role_id: true,
      },
    });
  const isOwner = employee.member_id === props.member.id;
  const hasViewPermission = await MyGlobal.prisma.hrm_platform_role_permissions
    .findMany({
      where: {
        role_id: employee.role_id,
        deleted_at: null,
        permission: {
          in: ["employee:view", "employee:manage"],
        },
      },
    })
    .then((permissions) => permissions.length > 0);
  if (!isOwner && !hasViewPermission) {
    throw new HttpException(
      "Forbidden: insufficient permissions to view this contract",
      403,
    );
  }
  return await HrmPlatformEmployeeContractTransformer.transform(contract);
}

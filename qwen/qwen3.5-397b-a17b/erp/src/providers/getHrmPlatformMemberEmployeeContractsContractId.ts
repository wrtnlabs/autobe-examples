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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeContractTransformer } from "../transformers/HrmPlatformEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberEmployeeContractsContractId(props: {
  member: MemberPayload;
  contractId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformEmployeeContract> {
  const contract =
    await MyGlobal.prisma.hrm_platform_employee_contracts.findFirstOrThrow({
      where: {
        id: props.contractId,
        deleted_at: null,
      },
      ...HrmPlatformEmployeeContractTransformer.select(),
    });
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: contract.employee.id },
      select: {
        id: true,
        member_id: true,
        organization_id: true,
      },
    });
  if (employee.member_id !== props.member.id) {
    const membership =
      await MyGlobal.prisma.hrm_platform_organization_memberships.findFirst({
        where: {
          hrm_platform_member_id: props.member.id,
          hrm_platform_organization_id: employee.organization_id,
          deleted_at: null,
        },
      });
    if (!membership) {
      throw new HttpException("Forbidden", 403);
    }
  }
  return await HrmPlatformEmployeeContractTransformer.transform(contract);
}

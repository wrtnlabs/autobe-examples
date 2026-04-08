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

export async function putHrmPlatformMemberEmployeeContractsContractId(props: {
  member: MemberPayload;
  contractId: string & tags.Format<"uuid">;
  body: IHrmPlatformEmployeeContract.IUpdate;
}): Promise<IHrmPlatformEmployeeContract> {
  const contract =
    await MyGlobal.prisma.hrm_platform_employee_contracts.findUniqueOrThrow({
      where: { id: props.contractId, deleted_at: null },
    });
  if (contract.end_date !== null) {
    throw new HttpException("Cannot update past contract", 400);
  }
  await MyGlobal.prisma.hrm_platform_employee_contracts.update({
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
      ...(props.body.notes !== undefined && { notes: props.body.notes }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_platform_employee_contracts.findUniqueOrThrow({
      where: { id: props.contractId },
      ...HrmPlatformEmployeeContractTransformer.select(),
    });
  return await HrmPlatformEmployeeContractTransformer.transform(updated);
}

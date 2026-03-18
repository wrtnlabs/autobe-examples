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

export async function putHrmPlatformMemberEmployeesEmployeeIdContractsContractId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
  body: IHrmPlatformEmployeeContract.IUpdate;
}): Promise<IHrmPlatformEmployeeContract> {
  const contract =
    await MyGlobal.prisma.hrm_platform_employee_contracts.findUniqueOrThrow({
      where: { id: props.contractId },
      select: {
        id: true,
        hrm_platform_employee_id: true,
        end_date: true,
      },
    });
  if (contract.hrm_platform_employee_id !== props.employeeId) {
    throw new HttpException("Contract not found", 404);
  }
  const now = new Date();
  if (contract.end_date !== null && contract.end_date < now) {
    throw new HttpException("Cannot update historical contract", 400);
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
      ...(props.body.end_date !== undefined && {
        end_date:
          props.body.end_date === null ? null : new Date(props.body.end_date),
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

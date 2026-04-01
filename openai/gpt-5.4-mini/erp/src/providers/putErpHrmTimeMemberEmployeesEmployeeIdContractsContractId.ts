import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContract";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeEmployeeContractTransformer } from "../transformers/ErpHrmTimeEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeMemberEmployeesEmployeeIdContractsContractId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
  body: IErpHrmTimeEmployeeContract.IUpdate;
}): Promise<IErpHrmTimeEmployeeContract> {
  const contract =
    await MyGlobal.prisma.erp_hrm_time_employee_contracts.findFirstOrThrow({
      where: {
        id: props.contractId,
        erp_hrm_time_employee_id: props.employeeId,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_employee_id: true,
        start_date: true,
        end_date: true,
        pay_rate: true,
        pay_period: true,
        working_hours_per_week: true,
        notes: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (contract.end_date !== null) {
    throw new HttpException("Immutable historical contract", 409);
  }
  const updated = await MyGlobal.prisma.erp_hrm_time_employee_contracts.update({
    where: { id: props.contractId },
    data: {
      ...(props.body.startDate !== undefined && {
        start_date: props.body.startDate,
      }),
      ...(props.body.endDate !== undefined && { end_date: props.body.endDate }),
      ...(props.body.payRate !== undefined && { pay_rate: props.body.payRate }),
      ...(props.body.payPeriod !== undefined && {
        pay_period: props.body.payPeriod,
      }),
      ...(props.body.workingHoursPerWeek !== undefined && {
        working_hours_per_week: props.body.workingHoursPerWeek,
      }),
      ...(props.body.notes !== undefined && { notes: props.body.notes }),
      updated_at: new Date(),
    },
    ...ErpHrmTimeEmployeeContractTransformer.select(),
  });
  return await ErpHrmTimeEmployeeContractTransformer.transform(updated);
}

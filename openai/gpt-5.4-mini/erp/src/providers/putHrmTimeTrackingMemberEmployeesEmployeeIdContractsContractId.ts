import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingEmployeeContractTransformer } from "../transformers/HrmTimeTrackingEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingMemberEmployeesEmployeeIdContractsContractId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingEmployeeContract.IUpdate;
}): Promise<IHrmTimeTrackingEmployeeContract> {
  await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
    where: {
      id: props.employeeId,
    },
    select: {
      id: true,
    },
  });
  const contract =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.findFirstOrThrow(
      {
        where: {
          id: props.contractId,
          hrm_time_tracking_employee_id: props.employeeId,
        },
        select: {
          id: true,
          hrm_time_tracking_employee_id: true,
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
      },
    );
  if (
    props.body.startDate !== undefined &&
    props.body.endDate !== undefined &&
    props.body.endDate !== null &&
    props.body.endDate < props.body.startDate
  ) {
    throw new HttpException("endDate must not precede startDate", 400);
  }
  if (props.body.payRate !== undefined && props.body.payRate <= 0) {
    throw new HttpException("payRate must be positive", 400);
  }
  if (
    props.body.workingHoursPerWeek !== undefined &&
    props.body.workingHoursPerWeek <= 0
  ) {
    throw new HttpException("workingHoursPerWeek must be positive", 400);
  }
  if (props.body.payPeriod !== undefined && props.body.payPeriod.length === 0) {
    throw new HttpException("payPeriod must not be empty", 400);
  }
  await MyGlobal.prisma.hrm_time_tracking_employee_contracts.update({
    where: {
      id: contract.id,
    },
    data: {
      ...(props.body.startDate !== undefined
        ? { start_date: props.body.startDate }
        : {}),
      ...(props.body.endDate !== undefined
        ? { end_date: props.body.endDate }
        : {}),
      ...(props.body.payRate !== undefined
        ? { pay_rate: props.body.payRate }
        : {}),
      ...(props.body.payPeriod !== undefined
        ? { pay_period: props.body.payPeriod }
        : {}),
      ...(props.body.workingHoursPerWeek !== undefined
        ? { working_hours_per_week: props.body.workingHoursPerWeek }
        : {}),
      ...(props.body.notes !== undefined ? { notes: props.body.notes } : {}),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.findUniqueOrThrow(
      {
        where: {
          id: contract.id,
        },
        ...HrmTimeTrackingEmployeeContractTransformer.select(),
      },
    );
  return await HrmTimeTrackingEmployeeContractTransformer.transform(updated);
}

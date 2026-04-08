import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeContract";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackEmployeeContractTransformer } from "../transformers/HrmTimeTrackEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackMemberEmployeesEmployeeIdContractsContractId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackEmployeeContract.IUpdate;
}): Promise<IHrmTimeTrackEmployeeContract> {
  const contract =
    await MyGlobal.prisma.hrm_time_track_employee_contracts.findUniqueOrThrow({
      where: {
        id: props.contractId,
        hrm_time_track_employee_id: props.employeeId,
      },
      select: {
        id: true,
        start_date: true,
        end_date: true,
      },
    });
  const employee =
    await MyGlobal.prisma.hrm_time_track_employees.findUniqueOrThrow({
      where: {
        id: props.employeeId,
      },
      select: {
        id: true,
        hrm_time_track_organization_id: true,
      },
    });
  const memberEmployee =
    await MyGlobal.prisma.hrm_time_track_employees.findFirst({
      where: {
        hrm_time_track_member_id: props.member.id,
        hrm_time_track_organization_id: employee.hrm_time_track_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (memberEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (contract.end_date !== null && contract.end_date < new Date()) {
    throw new HttpException(
      "Contract has already ended and cannot be modified",
      400,
    );
  }
  if (props.body.pay_rate !== undefined && props.body.pay_rate <= 0) {
    throw new HttpException("Pay rate must be a positive number", 400);
  }
  if (props.body.pay_period !== undefined) {
    const validPeriods: ("hourly" | "daily" | "weekly" | "monthly")[] = [
      "hourly",
      "daily",
      "weekly",
      "monthly",
    ];
    if (!validPeriods.includes(props.body.pay_period)) {
      throw new HttpException(
        "Pay period must be one of: hourly, daily, weekly, monthly",
        400,
      );
    }
  }
  if (
    props.body.working_hours_per_week !== undefined &&
    props.body.working_hours_per_week <= 0
  ) {
    throw new HttpException(
      "Working hours per week must be a positive number",
      400,
    );
  }
  if (props.body.end_date !== undefined && props.body.end_date !== null) {
    const endDate = new Date(props.body.end_date);
    if (endDate < contract.start_date) {
      throw new HttpException("End date must be after start date", 400);
    }
  }
  const updateData: Prisma.hrm_time_track_employee_contractsUpdateInput = {
    updated_at: new Date(),
    ...(props.body.pay_rate !== undefined && { pay_rate: props.body.pay_rate }),
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
  };
  await MyGlobal.prisma.hrm_time_track_employee_contracts.update({
    where: {
      id: props.contractId,
    },
    data: updateData,
  });
  const updated =
    await MyGlobal.prisma.hrm_time_track_employee_contracts.findUniqueOrThrow({
      where: {
        id: props.contractId,
      },
      ...HrmTimeTrackEmployeeContractTransformer.select(),
    });
  return await HrmTimeTrackEmployeeContractTransformer.transform(updated);
}

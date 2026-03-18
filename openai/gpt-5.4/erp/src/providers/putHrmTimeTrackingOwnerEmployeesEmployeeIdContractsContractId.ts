import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { HrmTimeTrackingEmployeeContractTransformer } from "../transformers/HrmTimeTrackingEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingOwnerEmployeesEmployeeIdContractsContractId(props: {
  owner: OwnerPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingEmployeeContract.IUpdate;
}): Promise<IHrmTimeTrackingEmployeeContract> {
  const target =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.findFirstOrThrow(
      {
        where: {
          id: props.contractId,
          hrm_time_tracking_employee_id: props.employeeId,
          deleted_at: null,
          employee: {
            is: {
              deleted_at: null,
            },
          },
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
        },
      },
    );
  const now = new Date();
  const activeContracts =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.findMany({
      where: {
        hrm_time_tracking_employee_id: props.employeeId,
        deleted_at: null,
        start_date: { lte: now },
        OR: [{ end_date: null }, { end_date: { gte: now } }],
      },
      select: {
        id: true,
      },
    });
  if (activeContracts.length !== 1 || activeContracts[0].id !== target.id) {
    throw new HttpException(
      "Only the current active contract can be edited",
      403,
    );
  }
  const nextStartDate =
    props.body.start_date !== undefined
      ? new Date(props.body.start_date)
      : target.start_date;
  const nextEndDate =
    props.body.end_date !== undefined
      ? props.body.end_date === null
        ? null
        : new Date(props.body.end_date)
      : target.end_date;
  if (nextEndDate !== null && nextStartDate.getTime() > nextEndDate.getTime()) {
    throw new HttpException("Contract period is invalid", 400);
  }
  const overlapWhere: Prisma.hrm_time_tracking_employee_contractsWhereInput =
    nextEndDate === null
      ? {
          hrm_time_tracking_employee_id: props.employeeId,
          deleted_at: null,
          id: { not: props.contractId },
          OR: [{ end_date: null }, { end_date: { gte: nextStartDate } }],
        }
      : {
          hrm_time_tracking_employee_id: props.employeeId,
          deleted_at: null,
          id: { not: props.contractId },
          AND: [
            {
              OR: [{ end_date: null }, { end_date: { gte: nextStartDate } }],
            },
            {
              start_date: { lte: nextEndDate },
            },
          ],
        };
  const overlapping =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.findFirst({
      where: overlapWhere,
      select: {
        id: true,
      },
    });
  if (overlapping !== null) {
    throw new HttpException("Contract period overlaps another contract", 400);
  }
  await MyGlobal.prisma.hrm_time_tracking_employee_contracts.update({
    where: {
      id: props.contractId,
    },
    data: {
      ...(props.body.start_date !== undefined
        ? { start_date: nextStartDate }
        : {}),
      ...(props.body.end_date !== undefined ? { end_date: nextEndDate } : {}),
      ...(props.body.pay_rate !== undefined
        ? { pay_rate: props.body.pay_rate }
        : {}),
      ...(props.body.pay_period !== undefined
        ? { pay_period: props.body.pay_period }
        : {}),
      ...(props.body.working_hours_per_week !== undefined
        ? { working_hours_per_week: props.body.working_hours_per_week }
        : {}),
      ...(props.body.notes !== undefined ? { notes: props.body.notes } : {}),
      updated_at: now,
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.findFirstOrThrow(
      {
        where: {
          id: props.contractId,
          hrm_time_tracking_employee_id: props.employeeId,
          deleted_at: null,
        },
        ...HrmTimeTrackingEmployeeContractTransformer.select(),
      },
    );
  return await HrmTimeTrackingEmployeeContractTransformer.transform(updated);
}

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";
import { HrmTimeTrackingEmployeeContractTransformer } from "../transformers/HrmTimeTrackingEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingManagerEmployeesEmployeeIdContractsContractId(props: {
  manager: ManagerPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingEmployeeContract.IUpdate;
}): Promise<IHrmTimeTrackingEmployeeContract> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(
    new globalThis.Date(),
  );
  const manager =
    await MyGlobal.prisma.hrm_time_tracking_managers.findUniqueOrThrow({
      where: {
        id: props.manager.id,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (manager.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        id: props.employeeId,
        deleted_at: null,
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
          hrm_time_tracking_employee_id: employee.id,
          deleted_at: null,
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
  const activeContract =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.findFirst({
      where: {
        hrm_time_tracking_employee_id: employee.id,
        deleted_at: null,
        start_date: {
          lte: new globalThis.Date(now),
        },
        OR: [
          {
            end_date: null,
          },
          {
            end_date: {
              gte: new globalThis.Date(now),
            },
          },
        ],
      },
      orderBy: {
        start_date: "desc",
      },
      select: {
        id: true,
      },
    });
  if (activeContract === null || activeContract.id !== contract.id) {
    throw new HttpException(
      "Only the current active contract can be edited",
      400,
    );
  }
  const nextStartDate: string & tags.Format<"date-time"> =
    props.body.start_date ?? toISOStringSafe(contract.start_date);
  const nextEndDate: (string & tags.Format<"date-time">) | null =
    props.body.end_date !== undefined
      ? props.body.end_date
      : contract.end_date === null
        ? null
        : toISOStringSafe(contract.end_date);
  if (
    nextEndDate !== null &&
    new globalThis.Date(nextEndDate).getTime() <
      new globalThis.Date(nextStartDate).getTime()
  ) {
    throw new HttpException("Invalid contract period", 400);
  }
  const overlappingContracts =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.count({
      where: {
        hrm_time_tracking_employee_id: employee.id,
        deleted_at: null,
        NOT: {
          id: contract.id,
        },
        ...(nextEndDate === null
          ? {
              OR: [
                {
                  end_date: null,
                },
                {
                  end_date: {
                    gte: new globalThis.Date(nextStartDate),
                  },
                },
              ],
            }
          : {
              AND: [
                {
                  start_date: {
                    lte: new globalThis.Date(nextEndDate),
                  },
                },
                {
                  OR: [
                    {
                      end_date: null,
                    },
                    {
                      end_date: {
                        gte: new globalThis.Date(nextStartDate),
                      },
                    },
                  ],
                },
              ],
            }),
      },
    });
  if (overlappingContracts !== 0) {
    throw new HttpException("Contract period overlaps another contract", 400);
  }
  await MyGlobal.prisma.hrm_time_tracking_employee_contracts.update({
    where: {
      id: contract.id,
    },
    data: {
      ...(props.body.start_date !== undefined
        ? {
            start_date: new globalThis.Date(props.body.start_date),
          }
        : {}),
      ...(props.body.end_date !== undefined
        ? {
            end_date:
              props.body.end_date === null
                ? null
                : new globalThis.Date(props.body.end_date),
          }
        : {}),
      ...(props.body.pay_rate !== undefined
        ? {
            pay_rate: props.body.pay_rate,
          }
        : {}),
      ...(props.body.pay_period !== undefined
        ? {
            pay_period: props.body.pay_period,
          }
        : {}),
      ...(props.body.working_hours_per_week !== undefined
        ? {
            working_hours_per_week: props.body.working_hours_per_week,
          }
        : {}),
      ...(props.body.notes !== undefined
        ? {
            notes: props.body.notes,
          }
        : {}),
      updated_at: new globalThis.Date(now),
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

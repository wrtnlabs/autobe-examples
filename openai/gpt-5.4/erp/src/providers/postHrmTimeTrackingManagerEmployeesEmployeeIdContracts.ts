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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingManagerEmployeesEmployeeIdContracts(props: {
  manager: ManagerPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingEmployeeContract.ICreate;
}): Promise<IHrmTimeTrackingEmployeeContract> {
  if (
    props.body.end_date !== undefined &&
    props.body.end_date !== null &&
    props.body.end_date < props.body.start_date
  ) {
    throw new HttpException("End date cannot be earlier than start date", 400);
  }
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.hrm_time_tracking_managers.findFirstOrThrow({
      where: {
        id: props.manager.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    const employee = await prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        id: props.employeeId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    const requestedStartTime = new globalThis.Date(
      props.body.start_date,
    ).getTime();
    const requestedEndTime =
      props.body.end_date === undefined || props.body.end_date === null
        ? Number.POSITIVE_INFINITY
        : new globalThis.Date(props.body.end_date).getTime();
    const contracts =
      await prisma.hrm_time_tracking_employee_contracts.findMany({
        where: {
          hrm_time_tracking_employee_id: employee.id,
          deleted_at: null,
        },
        select: {
          id: true,
          start_date: true,
          end_date: true,
        },
        orderBy: {
          start_date: "asc",
        },
      });
    for (const contract of contracts) {
      const existingStartTime = contract.start_date.getTime();
      const existingEndTime =
        contract.end_date === null
          ? Number.POSITIVE_INFINITY
          : contract.end_date.getTime();
      if (
        requestedStartTime <= existingEndTime &&
        existingStartTime <= requestedEndTime
      ) {
        throw new HttpException(
          "Contract period overlaps an existing contract",
          400,
        );
      }
    }
    const id = v4();
    const created = await prisma.hrm_time_tracking_employee_contracts.create({
      data: {
        id,
        start_date: new globalThis.Date(props.body.start_date),
        end_date:
          props.body.end_date === undefined || props.body.end_date === null
            ? null
            : new globalThis.Date(props.body.end_date),
        pay_rate: props.body.pay_rate,
        pay_period: props.body.pay_period,
        working_hours_per_week: props.body.working_hours_per_week,
        notes: props.body.notes ?? null,
        created_at: new globalThis.Date(),
        updated_at: new globalThis.Date(),
        deleted_at: null,
        employee: {
          connect: {
            id: employee.id,
          },
        },
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
        deleted_at: true,
      },
    });
    return {
      id: created.id,
      start_date: toISOStringSafe(created.start_date),
      end_date: created.end_date ? toISOStringSafe(created.end_date) : null,
      pay_rate: created.pay_rate,
      pay_period: created.pay_period,
      working_hours_per_week: created.working_hours_per_week,
      notes: created.notes ?? null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  });
}

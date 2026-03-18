import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";
import { HrmTimeTrackingEmployeeContractAtSummaryTransformer } from "../transformers/HrmTimeTrackingEmployeeContractAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingManagerEmployeesEmployeeIdContracts(props: {
  manager: ManagerPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingEmployeeContract.IRequest;
}): Promise<IPageIHrmTimeTrackingEmployeeContract.ISummary> {
  void props.manager;
  await MyGlobal.prisma.hrm_time_tracking_employees.findUniqueOrThrow({
    where: {
      id: props.employeeId,
    },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const sortField: string = props.body.sort ?? "start_date";
  const direction: string = props.body.direction ?? "desc";
  if (direction !== "asc" && direction !== "desc") {
    throw new HttpException("Invalid sort direction", 400);
  }
  const sortDirection: Prisma.SortOrder = direction;
  const orderByInput: Prisma.hrm_time_tracking_employee_contractsOrderByWithRelationInput[] =
    sortField === "start_date"
      ? [{ start_date: sortDirection }, { created_at: "desc" }]
      : sortField === "end_date"
        ? [{ end_date: sortDirection }, { created_at: "desc" }]
        : sortField === "created_at"
          ? [{ created_at: sortDirection }, { id: "desc" }]
          : sortField === "updated_at"
            ? [{ updated_at: sortDirection }, { id: "desc" }]
            : sortField === "pay_rate"
              ? [{ pay_rate: sortDirection }, { created_at: "desc" }]
              : sortField === "working_hours_per_week"
                ? [
                    { working_hours_per_week: sortDirection },
                    { created_at: "desc" },
                  ]
                : sortField === "pay_period"
                  ? [{ pay_period: sortDirection }, { created_at: "desc" }]
                  : [];
  if (orderByInput.length === 0) {
    throw new HttpException("Invalid sort field", 400);
  }
  const normalizedStatus: string | undefined = props.body.status?.toLowerCase();
  if (
    normalizedStatus !== undefined &&
    normalizedStatus !== "active" &&
    normalizedStatus !== "historical"
  ) {
    throw new HttpException("Invalid status filter", 400);
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const whereInput = {
    hrm_time_tracking_employee_id: props.employeeId,
    deleted_at: null,
    AND: [
      ...(props.body.startDateFrom !== undefined ||
      props.body.startDateTo !== undefined
        ? [
            {
              start_date: {
                ...(props.body.startDateFrom !== undefined
                  ? { gte: props.body.startDateFrom }
                  : {}),
                ...(props.body.startDateTo !== undefined
                  ? { lte: props.body.startDateTo }
                  : {}),
              },
            },
          ]
        : []),
      ...(props.body.endDateFrom !== undefined ||
      props.body.endDateTo !== undefined
        ? [
            {
              end_date: {
                ...(props.body.endDateFrom !== undefined
                  ? { gte: props.body.endDateFrom }
                  : {}),
                ...(props.body.endDateTo !== undefined
                  ? { lte: props.body.endDateTo }
                  : {}),
              },
            },
          ]
        : []),
      ...(props.body.pay_period !== undefined
        ? [
            {
              pay_period: props.body.pay_period,
            },
          ]
        : []),
      ...(normalizedStatus === "active"
        ? [
            {
              start_date: {
                lte: now,
              },
            },
            {
              OR: [{ end_date: null }, { end_date: { gte: now } }],
            },
          ]
        : []),
      ...(normalizedStatus === "historical"
        ? [
            {
              end_date: {
                lt: now,
              },
            },
          ]
        : []),
    ],
  } satisfies Prisma.hrm_time_tracking_employee_contractsWhereInput;
  const records =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        ...HrmTimeTrackingEmployeeContractAtSummaryTransformer.select().select,
        employee: {
          select: {
            id: true,
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackingEmployeeContractAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}

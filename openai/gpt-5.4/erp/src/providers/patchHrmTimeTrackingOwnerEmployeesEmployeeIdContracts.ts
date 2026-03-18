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
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { HrmTimeTrackingEmployeeContractAtSummaryTransformer } from "../transformers/HrmTimeTrackingEmployeeContractAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingOwnerEmployeesEmployeeIdContracts(props: {
  owner: OwnerPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingEmployeeContract.IRequest;
}): Promise<IPageIHrmTimeTrackingEmployeeContract.ISummary> {
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findUniqueOrThrow({
      where: {
        id: props.employeeId,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (employee.deleted_at !== null) {
    throw new HttpException("Employee not found", 404);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const direction: "asc" | "desc" =
    props.body.direction === undefined
      ? "desc"
      : props.body.direction === "asc"
        ? "asc"
        : props.body.direction === "desc"
          ? "desc"
          : (() => {
              throw new HttpException("Invalid sort direction", 400);
            })();
  const sortField:
    | "start_date"
    | "end_date"
    | "created_at"
    | "updated_at"
    | "pay_rate"
    | "working_hours_per_week"
    | "pay_period" =
    props.body.sort === undefined
      ? "start_date"
      : props.body.sort === "start_date"
        ? "start_date"
        : props.body.sort === "end_date"
          ? "end_date"
          : props.body.sort === "created_at"
            ? "created_at"
            : props.body.sort === "updated_at"
              ? "updated_at"
              : props.body.sort === "pay_rate"
                ? "pay_rate"
                : props.body.sort === "working_hours_per_week"
                  ? "working_hours_per_week"
                  : props.body.sort === "pay_period"
                    ? "pay_period"
                    : (() => {
                        throw new HttpException("Invalid sort field", 400);
                      })();
  if (
    props.body.status !== undefined &&
    props.body.status !== "active" &&
    props.body.status !== "historical"
  ) {
    throw new HttpException("Invalid status filter", 400);
  }
  const now = toISOStringSafe(new Date()) satisfies string as string &
    tags.Format<"date-time">;
  const whereInput = {
    hrm_time_tracking_employee_id: props.employeeId,
    deleted_at: null,
    ...(props.body.pay_period !== undefined && {
      pay_period: props.body.pay_period,
    }),
    AND: [
      ...(props.body.startDateFrom !== undefined ||
      props.body.startDateTo !== undefined
        ? [
            {
              start_date: {
                ...(props.body.startDateFrom !== undefined && {
                  gte: props.body.startDateFrom,
                }),
                ...(props.body.startDateTo !== undefined && {
                  lte: props.body.startDateTo,
                }),
              },
            },
          ]
        : []),
      ...(props.body.endDateFrom !== undefined ||
      props.body.endDateTo !== undefined
        ? [
            {
              end_date: {
                ...(props.body.endDateFrom !== undefined && {
                  gte: props.body.endDateFrom,
                }),
                ...(props.body.endDateTo !== undefined && {
                  lte: props.body.endDateTo,
                }),
              },
            },
          ]
        : []),
      ...(props.body.status === "active"
        ? [
            {
              start_date: {
                lte: now,
              },
            },
            {
              OR: [
                {
                  end_date: null,
                },
                {
                  end_date: {
                    gt: now,
                  },
                },
              ],
            },
          ]
        : []),
      ...(props.body.status === "historical"
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
  const orderByInput: Prisma.hrm_time_tracking_employee_contractsOrderByWithRelationInput[] =
    sortField === "start_date"
      ? [{ start_date: direction }, { created_at: "desc" }, { id: "desc" }]
      : sortField === "end_date"
        ? [{ end_date: direction }, { created_at: "desc" }, { id: "desc" }]
        : sortField === "created_at"
          ? [{ created_at: direction }, { id: "desc" }]
          : sortField === "updated_at"
            ? [
                { updated_at: direction },
                { created_at: "desc" },
                { id: "desc" },
              ]
            : sortField === "pay_rate"
              ? [
                  { pay_rate: direction },
                  { created_at: "desc" },
                  { id: "desc" },
                ]
              : sortField === "working_hours_per_week"
                ? [
                    { working_hours_per_week: direction },
                    { created_at: "desc" },
                    { id: "desc" },
                  ]
                : [
                    { pay_period: direction },
                    { created_at: "desc" },
                    { id: "desc" },
                  ];
  const transformerSelect =
    HrmTimeTrackingEmployeeContractAtSummaryTransformer.select();
  const data =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        ...transformerSelect.select,
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
      data,
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

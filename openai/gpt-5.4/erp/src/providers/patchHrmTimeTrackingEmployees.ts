import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployee";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingEmployeeAtSummaryTransformer } from "../transformers/HrmTimeTrackingEmployeeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingEmployees(props: {
  body: IHrmTimeTrackingEmployee.IRequest;
}): Promise<IPageIHrmTimeTrackingEmployee.ISummary> {
  const now: string & tags.Format<"date-time"> = typia.random<
    string & tags.Format<"date-time">
  >();
  const current: number & tags.Type<"int32"> & tags.Minimum<1> = (props.body
    .page ?? 1) satisfies number as number;
  const limit:
    | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
    | 100 = (props.body.limit ?? 100) satisfies number as number;
  const skip = (current - 1) * limit;
  if (
    props.body.sort !== undefined &&
    props.body.sort !== "email_asc" &&
    props.body.sort !== "email_desc" &&
    props.body.sort !== "created_at_asc" &&
    props.body.sort !== "created_at_desc"
  ) {
    throw new HttpException("Invalid sort option", 400);
  }
  const activeSession =
    await MyGlobal.prisma.hrm_time_tracking_employee_sessions.findFirst({
      where: {
        hrm_time_tracking_organization_id: { not: null },
        logged_out_at: null,
        expired_at: {
          gt: now,
        },
      },
      select: {
        id: true,
        hrm_time_tracking_employee_id: true,
        hrm_time_tracking_organization_id: true,
        created_at: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  if (
    activeSession === null ||
    activeSession.hrm_time_tracking_organization_id === null
  ) {
    throw new HttpException("Unauthorized", 401);
  }
  if (props.body.departmentId !== undefined) {
    await MyGlobal.prisma.hrm_time_tracking_departments.findFirstOrThrow({
      where: {
        id: props.body.departmentId,
        hrm_time_tracking_organization_id:
          activeSession.hrm_time_tracking_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  }
  const whereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined && props.body.search.length !== 0
      ? {
          email: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
    sessions: {
      some: {
        hrm_time_tracking_organization_id:
          activeSession.hrm_time_tracking_organization_id,
      },
    },
  } satisfies Prisma.hrm_time_tracking_employeesWhereInput;
  const orderByInput: Prisma.hrm_time_tracking_employeesOrderByWithRelationInput[] =
    props.body.sort === "email_asc"
      ? [{ email: "asc" }, { id: "asc" }]
      : props.body.sort === "email_desc"
        ? [{ email: "desc" }, { id: "asc" }]
        : props.body.sort === "created_at_asc"
          ? [{ created_at: "asc" }, { id: "asc" }]
          : [{ created_at: "desc" }, { id: "asc" }];
  const rows = await MyGlobal.prisma.hrm_time_tracking_employees.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.hrm_time_tracking_employees.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      rows,
      HrmTimeTrackingEmployeeAtSummaryTransformer.transform,
    ),
    pagination: {
      current,
      limit,
      records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}

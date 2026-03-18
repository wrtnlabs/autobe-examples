import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTimelogAtSummaryTransformer } from "../transformers/HrmTimeTrackingTimelogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingMemberTimelogs(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingTimelog.IRequest;
}): Promise<IPageIHrmTimeTrackingTimelog.ISummary> {
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        user_account_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
      },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  if (props.body.project_id !== undefined) {
    await MyGlobal.prisma.hrm_time_tracking_projects.findFirstOrThrow({
      where: {
        id: props.body.project_id,
        organization_id: employee.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  }
  if (props.body.task_id !== undefined) {
    await MyGlobal.prisma.hrm_time_tracking_tasks.findFirstOrThrow({
      where: {
        id: props.body.task_id,
        project: {
          organization_id: employee.organization_id,
          ...(props.body.project_id !== undefined
            ? { id: props.body.project_id }
            : {}),
        },
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  }
  const where = {
    organization_id: employee.organization_id,
    deleted_at: null,
    employee_id: props.body.employee_id ?? employee.id,
    ...(props.body.project_id !== undefined
      ? { project_id: props.body.project_id }
      : {}),
    ...(props.body.task_id !== undefined
      ? { task_id: props.body.task_id }
      : {}),
    ...(props.body.billable !== undefined
      ? { billable: props.body.billable }
      : {}),
    ...(props.body.work_date_from !== undefined ||
    props.body.work_date_to !== undefined
      ? {
          work_date: {
            ...(props.body.work_date_from !== undefined
              ? { gte: props.body.work_date_from }
              : {}),
            ...(props.body.work_date_to !== undefined
              ? { lte: props.body.work_date_to }
              : {}),
          },
        }
      : {}),
    ...(props.body.search !== undefined
      ? {
          description: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
  } satisfies Prisma.hrm_time_tracking_timelogsWhereInput;
  const orderBy = (
    props.body.sort === "work_date_asc"
      ? [{ work_date: "asc" }, { id: "asc" }]
      : props.body.sort === "created_at_asc"
        ? [{ created_at: "asc" }, { id: "asc" }]
        : props.body.sort === "created_at_desc"
          ? [{ created_at: "desc" }, { id: "desc" }]
          : [{ work_date: "desc" }, { id: "desc" }]
  ) satisfies Prisma.hrm_time_tracking_timelogsOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.hrm_time_tracking_timelogs.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...HrmTimeTrackingTimelogAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.hrm_time_tracking_timelogs.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmTimeTrackingTimelogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}

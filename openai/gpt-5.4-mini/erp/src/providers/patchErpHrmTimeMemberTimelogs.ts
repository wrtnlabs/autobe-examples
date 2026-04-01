import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimelogAtSummaryTransformer } from "../transformers/ErpHrmTimeTimelogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberTimelogs(props: {
  member: MemberPayload;
  body: IErpHrmTimeTimelog.IRequest;
}): Promise<IPageIErpHrmTimeTimelog.ISummary> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow(
      {
        where: {
          erp_hrm_time_member_id: props.member.id,
          is_selected_context: true,
          deleted_at: null,
        },
        select: {
          erp_hrm_time_organization_id: true,
        },
      },
    );
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        erp_hrm_time_member_id: props.member.id,
        erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  if (props.body.projectId !== undefined) {
    await MyGlobal.prisma.erp_hrm_time_projects.findFirstOrThrow({
      where: {
        id: props.body.projectId,
        erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  }
  if (props.body.taskId !== undefined) {
    await MyGlobal.prisma.erp_hrm_time_tasks.findFirstOrThrow({
      where: {
        id: props.body.taskId,
        deleted_at: null,
        ...(props.body.projectId !== undefined
          ? { erp_hrm_time_project_id: props.body.projectId }
          : {}),
        project: {
          erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
          deleted_at: null,
        },
      },
      select: {
        id: true,
      },
    });
  }
  const where: Prisma.erp_hrm_time_timelogsWhereInput = {
    deleted_at: null,
    project: {
      erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
      deleted_at: null,
      ...(props.body.projectId !== undefined && { id: props.body.projectId }),
    },
    ...(props.body.taskId !== undefined
      ? { erp_hrm_time_task_id: props.body.taskId }
      : {}),
    ...(props.body.billable !== undefined
      ? { billable: props.body.billable }
      : {}),
    ...(props.body.search !== undefined && props.body.search.length > 0
      ? {
          description: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.workDateFrom !== undefined ||
    props.body.workDateTo !== undefined
      ? {
          work_date: {
            ...(props.body.workDateFrom !== undefined
              ? { gte: new Date(props.body.workDateFrom) }
              : {}),
            ...(props.body.workDateTo !== undefined
              ? { lte: new Date(props.body.workDateTo) }
              : {}),
          },
        }
      : {}),
    member: {
      id: employee.id,
      deleted_at: null,
    },
  };
  const orderBy: Prisma.erp_hrm_time_timelogsOrderByWithRelationInput[] =
    props.body.sort === "workDateAsc"
      ? [{ work_date: "asc" }, { id: "asc" }]
      : props.body.sort === "createdAtAsc"
        ? [{ created_at: "asc" }, { id: "asc" }]
        : props.body.sort === "createdAtDesc"
          ? [{ created_at: "desc" }, { id: "desc" }]
          : [{ work_date: "desc" }, { id: "desc" }];
  const data = await MyGlobal.prisma.erp_hrm_time_timelogs.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...ErpHrmTimeTimelogAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.erp_hrm_time_timelogs.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimeTimelogAtSummaryTransformer.transform,
    ),
  };
}

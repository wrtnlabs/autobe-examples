import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTaskHistoryEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTaskHistoryEntryAtSummaryTransformer } from "../transformers/ErpHrmTimeTaskHistoryEntryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTaskHistoryEntry.IRequest;
}): Promise<IPageIErpHrmTimeTaskHistoryEntry.ISummary> {
  await MyGlobal.prisma.erp_hrm_time_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
      organization: {
        organizationMemberships: {
          some: {
            member: {
              id: props.member.id,
            },
          },
        },
      },
    },
    select: {
      id: true,
    },
  });
  if (props.body.employeeId !== undefined) {
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        id: props.body.employeeId,
        deleted_at: null,
        organization: {
          organizationMemberships: {
            some: {
              member: {
                id: props.member.id,
              },
            },
          },
        },
      },
      select: {
        id: true,
      },
    });
  }
  const page: number = props.body.page;
  const pageSize: number = props.body.pageSize;
  const skip: number = (page - 1) * pageSize;
  const where = {
    erp_hrm_time_project_id: props.projectId,
    deleted_at: null,
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.priority !== undefined
      ? { priority: props.body.priority }
      : {}),
    ...(props.body.employeeId !== undefined
      ? { erp_hrm_time_employee_id: props.body.employeeId }
      : {}),
  } satisfies Prisma.erp_hrm_time_tasksWhereInput;
  const orderBy = (
    props.body.sort === "dueDate"
      ? { due_date: props.body.order ?? "asc" }
      : props.body.sort === "priority"
        ? { priority: props.body.order ?? "asc" }
        : { created_at: props.body.order ?? "desc" }
  ) satisfies Prisma.erp_hrm_time_tasksOrderByWithRelationInput;
  const data = await MyGlobal.prisma.erp_hrm_time_tasks.findMany({
    where,
    skip,
    take: pageSize,
    orderBy,
    ...ErpHrmTimeTaskHistoryEntryAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.erp_hrm_time_tasks.count({ where });
  return {
    data: await ErpHrmTimeTaskHistoryEntryAtSummaryTransformer.transformAll(
      data,
    ),
    pagination: {
      current: page,
      limit: pageSize,
      records,
      pages: Math.ceil(records / pageSize),
    } satisfies IPage.IPagination,
  };
}

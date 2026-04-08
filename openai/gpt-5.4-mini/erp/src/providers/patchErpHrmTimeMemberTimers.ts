import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { IErpHrmTimeTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimerAtSummaryTransformer } from "../transformers/ErpHrmTimeTimerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberTimers(props: {
  member: MemberPayload;
  body: IErpHrmTimeTimer.IRequest;
}): Promise<IPageIErpHrmTimeTimer.ISummary> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        erp_hrm_time_organization_id: true,
      },
    });
  if (membership === null)
    throw new HttpException("Selected organization context not found", 403);
  const employee = await MyGlobal.prisma.erp_hrm_time_employees.findFirst({
    where: {
      erp_hrm_time_member_id: props.member.id,
      erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (employee === null)
    throw new HttpException("Employee not found in selected organization", 403);
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    deleted_at: null,
    employee: {
      erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
      id: employee.id,
    },
    ...(props.body.projectId !== undefined
      ? { project_id: props.body.projectId }
      : {}),
    ...(props.body.taskId !== undefined
      ? props.body.taskId === null
        ? { task_id: null }
        : { task_id: props.body.taskId }
      : {}),
    ...(props.body.startedAtFrom !== undefined ||
    props.body.startedAtTo !== undefined
      ? {
          started_at: {
            ...(props.body.startedAtFrom !== undefined
              ? { gte: props.body.startedAtFrom }
              : {}),
            ...(props.body.startedAtTo !== undefined
              ? { lte: props.body.startedAtTo }
              : {}),
          },
        }
      : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined
              ? { gte: props.body.createdAtFrom }
              : {}),
            ...(props.body.createdAtTo !== undefined
              ? { lte: props.body.createdAtTo }
              : {}),
          },
        }
      : {}),
    ...(props.body.isRunning === true ? { deleted_at: null } : {}),
    ...(props.body.search !== undefined
      ? {
          OR: [
            {
              description: { contains: props.body.search, mode: "insensitive" },
            },
          ],
        }
      : {}),
  } satisfies Prisma.erp_hrm_time_timersWhereInput;
  const orderBy = (
    props.body.sort === "startedAt"
      ? { started_at: "asc" as const }
      : props.body.sort === "-startedAt"
        ? { started_at: "desc" as const }
        : props.body.sort === "createdAt"
          ? { created_at: "asc" as const }
          : { created_at: "desc" as const }
  ) satisfies Prisma.erp_hrm_time_timersOrderByWithRelationInput;
  const data = await MyGlobal.prisma.erp_hrm_time_timers.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...ErpHrmTimeTimerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_time_timers.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimeTimerAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}

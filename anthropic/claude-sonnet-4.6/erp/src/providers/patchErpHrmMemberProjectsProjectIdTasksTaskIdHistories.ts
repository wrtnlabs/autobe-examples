import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTaskHistoryAtSummaryTransformer } from "../transformers/ErpHrmTaskHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberProjectsProjectIdTasksTaskIdHistories(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IErpHrmTaskHistory.IRequest;
}): Promise<IPageIErpHrmTaskHistory.ISummary> {
  // 1. Validate project exists (not deleted)
  const project = await MyGlobal.prisma.erp_hrm_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
    },
  });
  // 2. Find the org member record for the authenticated user in this organization
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        organization_id: project.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  // 3. Validate task exists in this project (not deleted)
  await MyGlobal.prisma.erp_hrm_tasks.findFirstOrThrow({
    where: {
      id: props.taskId,
      erp_hrm_project_id: props.projectId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // 4. Authorization: check project:manage permission or project membership
  const hasProjectManage =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        role_id: orgMember.role_id,
        permission_code: "project:manage",
      },
      select: { id: true },
    });
  if (!hasProjectManage) {
    const projectMember =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          organization_member_id: orgMember.id,
          project_id: props.projectId,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (!projectMember) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 5. Pagination parameters
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 6. Build WHERE clause for history query
  const whereInput = {
    erp_hrm_task_id: props.taskId,
    ...(body.oldStatus != null && { old_status: body.oldStatus }),
    ...(body.newStatus != null && { new_status: body.newStatus }),
    ...(body.recorderId != null && {
      erp_hrm_organization_member_id: body.recorderId,
    }),
    ...((body.createdAtFrom != null || body.createdAtTo != null) && {
      created_at: {
        ...(body.createdAtFrom != null && {
          gte: new Date(body.createdAtFrom),
        }),
        ...(body.createdAtTo != null && { lte: new Date(body.createdAtTo) }),
      },
    }),
  } satisfies Prisma.erp_hrm_task_historiesWhereInput;
  // 7. Ordering
  const orderByInput = (
    body.sortOrder === "desc"
      ? { created_at: "desc" as const }
      : { created_at: "asc" as const }
  ) satisfies Prisma.erp_hrm_task_historiesOrderByWithRelationInput;
  // 8. Query data and count sequentially
  const data = await MyGlobal.prisma.erp_hrm_task_histories.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmTaskHistoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_task_histories.count({
    where: whereInput,
  });
  // 9. Transform and return paginated result
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTaskHistoryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: limit === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}

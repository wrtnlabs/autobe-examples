import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimerAtSummaryTransformer } from "../transformers/ErpHrmTimerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberTimers(props: {
  member: MemberPayload;
  body: IErpHrmTimer.IRequest;
}): Promise<IPageIErpHrmTimer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortOrder = props.body.sortOrder === "asc" ? "asc" : "desc";
  // Find the requesting member's organization member record
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        role_id: true,
      },
    });
  // Check if the member has time:view_all permission
  const viewAllPermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        role_id: orgMember.role_id,
        permission_code: "time:view_all",
      },
      select: { id: true },
    });
  const hasViewAll = viewAllPermission !== null;
  // Build the base WHERE clause based on permission level
  const baseFilter = hasViewAll
    ? ({
        organizationMember: {
          organization_id: orgMember.organization_id,
          deleted_at: null,
        },
        ...(props.body.organizationMemberId != null && {
          organization_member_id: props.body.organizationMemberId,
        }),
      } satisfies Prisma.erp_hrm_timersWhereInput)
    : ({
        organization_member_id: orgMember.id,
      } satisfies Prisma.erp_hrm_timersWhereInput);
  const taskFilter: Prisma.erp_hrm_timersWhereInput =
    props.body.hasTask === true
      ? { task_id: { not: null } }
      : props.body.hasTask === false
        ? { task_id: null }
        : {};
  const projectFilter: Prisma.erp_hrm_timersWhereInput =
    props.body.projectId != null ? { project_id: props.body.projectId } : {};
  const whereInput = {
    ...baseFilter,
    ...taskFilter,
    ...projectFilter,
  } satisfies Prisma.erp_hrm_timersWhereInput;
  const data = await MyGlobal.prisma.erp_hrm_timers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { started_at: sortOrder },
    ...ErpHrmTimerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_timers.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimerAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}

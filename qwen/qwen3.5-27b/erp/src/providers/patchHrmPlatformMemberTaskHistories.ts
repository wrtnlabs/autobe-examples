import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTaskHistoryAtSummaryTransformer } from "../transformers/HrmPlatformTaskHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberTaskHistories(props: {
  member: MemberPayload;
  body: IHrmPlatformTaskHistory.IRequest;
}): Promise<IPageIHrmPlatformTaskHistory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Get project IDs that the member has access to
  const projectIds =
    await MyGlobal.prisma.hrm_platform_project_memberships.findMany({
      where: {
        employee: {
          id: props.member.id,
          deleted_at: null,
        },
        deleted_at: null,
      },
      select: {
        hrm_platform_project_id: true,
      },
    });
  // Build where clause for filters
  const whereInput: Prisma.hrm_platform_task_historiesWhereInput = {
    ...(props.body.taskId && {
      hrm_platform_task_id: props.body.taskId,
    }),
    ...(props.body.memberId && {
      hrm_platform_member_id: props.body.memberId,
    }),
    ...(props.body.oldStatus && {
      old_status: props.body.oldStatus,
    }),
    ...(props.body.newStatus && {
      new_status: props.body.newStatus,
    }),
    ...(props.body.dateRange && {
      created_at: {
        ...(props.body.dateRange.from && {
          gte: new Date(props.body.dateRange.from),
        }),
        ...(props.body.dateRange.to && {
          lte: new Date(props.body.dateRange.to),
        }),
      },
    }),
    // Authorization: only tasks from projects the member can access
    task: {
      hrm_platform_project_id: {
        in: projectIds.map((pm) => pm.hrm_platform_project_id),
      },
    },
  } satisfies Prisma.hrm_platform_task_historiesWhereInput;
  const data = await MyGlobal.prisma.hrm_platform_task_histories.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...HrmPlatformTaskHistoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_task_histories.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformTaskHistoryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}

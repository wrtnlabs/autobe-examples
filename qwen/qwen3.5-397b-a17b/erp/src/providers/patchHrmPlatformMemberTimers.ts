import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimerAtSummaryTransformer } from "../transformers/HrmPlatformTimerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberTimers(props: {
  member: MemberPayload;
  body: IHrmPlatformTimer.IRequest;
}): Promise<IPageIHrmPlatformTimer.ISummary> {
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_timersWhereInput = {
    hrm_platform_employee_id: employee.id,
    ...(props.body.status !== undefined && {
      stopped_at: props.body.status === "active" ? null : { not: null },
    }),
    ...(props.body.projectId !== undefined && {
      hrm_platform_project_id: props.body.projectId,
    }),
    ...(props.body.taskId !== undefined && {
      hrm_platform_task_id: props.body.taskId,
    }),
    ...(props.body.dateFrom !== undefined && {
      started_at: {
        gte: props.body.dateFrom,
        ...(props.body.dateTo !== undefined && { lte: props.body.dateTo }),
      },
    }),
    ...(props.body.dateFrom === undefined &&
      props.body.dateTo !== undefined && {
        started_at: {
          lte: props.body.dateTo,
        },
      }),
  } satisfies Prisma.hrm_platform_timersWhereInput;
  const records = await MyGlobal.prisma.hrm_platform_timers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { started_at: "desc" },
    ...HrmPlatformTimerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_timers.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformTimerAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmPlatformTimer.ISummary;
}

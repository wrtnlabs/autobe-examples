import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  const whereInput = {
    employee_id: employee.id,
    deleted_at: null,
    ...(props.body.stopped !== undefined && {
      stopped_at: props.body.stopped === true ? { not: null } : null,
    }),
    ...(props.body.project_id !== undefined && {
      project_id: props.body.project_id,
    }),
    ...(props.body.task_id !== undefined && { task_id: props.body.task_id }),
    ...(props.body.started_at !== undefined && {
      started_at: props.body.started_at,
    }),
    ...(props.body.description !== undefined &&
      props.body.description !== null && {
        description: { contains: props.body.description },
      }),
  } satisfies Prisma.hrm_platform_timersWhereInput;
  const orderByInput = (
    props.body.sort === undefined || props.body.sort === "started_at"
      ? { started_at: (props.body.direction ?? "desc") as "asc" | "desc" }
      : props.body.sort === "created_at"
        ? { created_at: (props.body.direction ?? "desc") as "asc" | "desc" }
        : { started_at: "desc" as const }
  ) satisfies Prisma.hrm_platform_timersOrderByWithRelationInput;
  const data = await MyGlobal.prisma.hrm_platform_timers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformTimerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_timers.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformTimerAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}

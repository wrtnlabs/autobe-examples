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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    hrm_platform_employee_id: props.member.id,
    deleted_at: null,
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.projectId !== undefined && {
      hrm_platform_project_id: props.body.projectId,
    }),
    ...(props.body.taskId !== undefined && {
      hrm_platform_task_id: props.body.taskId,
    }),
    ...(props.body.createdAt !== undefined && {
      created_at: {
        ...(props.body.createdAt.gte !== undefined && {
          gte: new Date(props.body.createdAt.gte),
        }),
        ...(props.body.createdAt.lte !== undefined && {
          lte: new Date(props.body.createdAt.lte),
        }),
      },
    }),
    ...(props.body.lastTickAt !== undefined && {
      last_tick_at: {
        ...(props.body.lastTickAt.gte !== undefined && {
          gte: new Date(props.body.lastTickAt.gte),
        }),
        ...(props.body.lastTickAt.lte !== undefined && {
          lte: new Date(props.body.lastTickAt.lte),
        }),
      },
    }),
  } satisfies Prisma.hrm_platform_timersWhereInput;
  const orderByInput = (
    props.body.sortField !== undefined && props.body.sortOrder !== undefined
      ? {
          [props.body.sortField === "createdAt"
            ? "created_at"
            : props.body.sortField === "updatedAt"
              ? "updated_at"
              : props.body.sortField === "durationSeconds"
                ? "duration_seconds"
                : props.body.sortField === "status"
                  ? "status"
                  : "last_tick_at"]: props.body.sortOrder,
        }
      : { created_at: "desc" as const }
  ) satisfies Prisma.hrm_platform_timersOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.hrm_platform_timers.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...HrmPlatformTimerAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_platform_timers.count({ where: whereInput }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformTimerAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmPlatformTimer.ISummary;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
// import { IPageIHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimer";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberTimers(props: {
//   member: MemberPayload;
//   body: IHrmPlatformTimer.IRequest;
// }): Promise<IPageIHrmPlatformTimer.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_timers.findMany({
//     ...HrmPlatformTimerAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformTimerAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------
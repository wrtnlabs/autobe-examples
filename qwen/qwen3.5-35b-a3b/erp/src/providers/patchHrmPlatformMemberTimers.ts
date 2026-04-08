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
  const limit = props.body.limit ?? props.body.pageSize ?? 20;
  const pageSize = limit < 20 ? 20 : limit > 100 ? 100 : limit;
  const skip = (page - 1) * pageSize;
  const where: Prisma.hrm_platform_timersWhereInput = {
    deleted_at: null,
    hrm_platform_employee_id: props.member.id,
  };
  if (props.body.status !== undefined) {
    where.status = props.body.status;
  }
  if (props.body.projectId !== undefined) {
    where.hrm_platform_project_id = props.body.projectId;
  }
  if (props.body.taskId !== undefined) {
    where.hrm_platform_task_id = props.body.taskId;
  }
  if (props.body.createdAt !== undefined) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (props.body.createdAt.gte !== undefined) {
      dateFilter.gte = new Date(props.body.createdAt.gte);
    }
    if (props.body.createdAt.lte !== undefined) {
      dateFilter.lte = new Date(props.body.createdAt.lte);
    }
    where.created_at = dateFilter;
  }
  if (props.body.lastTickAt !== undefined) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (props.body.lastTickAt.gte !== undefined) {
      dateFilter.gte = new Date(props.body.lastTickAt.gte);
    }
    if (props.body.lastTickAt.lte !== undefined) {
      dateFilter.lte = new Date(props.body.lastTickAt.lte);
    }
    where.last_tick_at = dateFilter;
  }
  const sortFieldMap: Record<string, string> = {
    createdAt: "created_at",
    updatedAt: "updated_at",
    durationSeconds: "duration_seconds",
    status: "status",
    lastTickAt: "last_tick_at",
  };
  const orderByField = props.body.sortField
    ? sortFieldMap[props.body.sortField]
    : "created_at";
  const sortOrder = props.body.sortOrder === "desc" ? "desc" : "asc";
  const orderBy = {
    [orderByField]: sortOrder,
  } satisfies Prisma.hrm_platform_timersOrderByWithRelationInput;
  const data = await MyGlobal.prisma.hrm_platform_timers.findMany({
    where,
    skip,
    take: pageSize,
    orderBy,
    ...HrmPlatformTimerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_timers.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / pageSize),
    },
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformTimerAtSummaryTransformer.transform,
    ),
  };
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
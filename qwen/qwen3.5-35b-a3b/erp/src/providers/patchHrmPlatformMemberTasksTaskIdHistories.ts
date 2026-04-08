import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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

export async function patchHrmPlatformMemberTasksTaskIdHistories(props: {
  member: MemberPayload;
  taskId: string & tags.Format<"uuid">;
  body: IHrmPlatformTaskHistory.IRequest;
}): Promise<IPageIHrmPlatformTaskHistory.ISummary> {
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: { id: props.taskId, deleted_at: null },
    select: {
      id: true,
      project_id: true,
      assigned_employee_id: true,
    },
  });
  const taskMember =
    await MyGlobal.prisma.hrm_platform_project_memberships.findFirst({
      where: {
        project: { id: task.project_id },
        employee: { id: props.member.id },
      },
      select: {
        id: true,
        role: true,
      },
    });
  const hasProjectManagement =
    taskMember?.role === "project lead" || taskMember?.role === "project_lead";
  const isAssigned = task.assigned_employee_id === props.member.id;
  if (!hasProjectManagement && !isAssigned) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit =
    props.body.limit !== undefined ? Math.min(props.body.limit, 100) : 50;
  const skip = (page - 1) * limit;
  const where: Prisma.hrm_platform_task_historiesWhereInput = {
    task_id: props.taskId,
    deleted_at: null,
  };
  if (props.body.actor_id !== undefined) {
    where.actor_id = props.body.actor_id;
  }
  if (props.body.action_type !== undefined) {
    where.action_type = props.body.action_type;
  }
  if (
    props.body.status_before !== null &&
    props.body.status_before !== undefined
  ) {
    where.status_before = props.body.status_before;
  }
  if (
    props.body.status_after !== null &&
    props.body.status_after !== undefined
  ) {
    where.status_after = props.body.status_after;
  }
  const changedAtCondition: Prisma.DateTimeFilter = {};
  if (props.body.changed_at_gte !== undefined) {
    changedAtCondition.gte = props.body.changed_at_gte;
  }
  if (props.body.changed_at_lte !== undefined) {
    changedAtCondition.lte = props.body.changed_at_lte;
  }
  if (Object.keys(changedAtCondition).length > 0) {
    where.changed_at = changedAtCondition;
  }
  const orderByInput: Prisma.hrm_platform_task_historiesOrderByWithRelationInput =
    {
      changed_at: props.body.sort_order === "asc" ? "asc" : "desc",
    } satisfies Prisma.hrm_platform_task_historiesOrderByWithRelationInput;
  const records = await MyGlobal.prisma.hrm_platform_task_histories.findMany({
    where,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...HrmPlatformTaskHistoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_task_histories.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformTaskHistoryAtSummaryTransformer.transform,
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
// import { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
// import { IPageIHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTaskHistory";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberTasksTaskIdHistories(props: {
//   member: MemberPayload;
//   taskId: string & tags.Format<"uuid">;
//   body: IHrmPlatformTaskHistory.IRequest;
// }): Promise<IPageIHrmPlatformTaskHistory.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_task_histories.findMany({
//     ...HrmPlatformTaskHistoryAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformTaskHistoryAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------
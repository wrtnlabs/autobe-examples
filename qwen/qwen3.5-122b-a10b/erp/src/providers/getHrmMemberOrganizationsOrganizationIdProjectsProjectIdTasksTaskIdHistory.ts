import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTaskHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTaskHistoryAtSummaryTransformer } from "../transformers/HrmTaskHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmMemberOrganizationsOrganizationIdProjectsProjectIdTasksTaskIdHistory(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<IPageIHrmTaskHistory.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.hrm_organizations.findUniqueOrThrow({
    where: {
      id: props.organizationId,
    },
  });
  const project = await MyGlobal.prisma.hrm_projects.findUnique({
    where: {
      id: props.projectId,
      hrm_organization_id: props.organizationId,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found or access denied", 404);
  }
  await MyGlobal.prisma.hrm_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      project_id: props.projectId,
    },
  });
  const records = await MyGlobal.prisma.hrm_task_histories.findMany({
    where: {
      hrm_task_id: props.taskId,
    },
    skip,
    take: limit,
    orderBy: { timestamp: "desc" },
    ...HrmTaskHistoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_task_histories.count({
    where: {
      hrm_task_id: props.taskId,
    },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      HrmTaskHistoryAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmTaskHistory.ISummary;
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
// import { IPageIHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTaskHistory";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTaskHistory";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmMemberOrganizationsOrganizationIdProjectsProjectIdTasksTaskIdHistory(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   projectId: string & tags.Format<"uuid">;
//   taskId: string & tags.Format<"uuid">;
// }): Promise<IPageIHrmTaskHistory.ISummary> {
//   const records = await MyGlobal.prisma.hrm_task_histories.findMany({
//     ...HrmTaskHistoryAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTaskHistoryAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmMemberAtSummaryTransformer } from "../transformers/ErpHrmMemberAtSummaryTransformer";
import { ErpHrmTaskHistoryTransformer } from "../transformers/ErpHrmTaskHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmAdminProjectsProjectIdTasksTaskIdHistoriesHistoryId(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTaskHistory> {
  // Query history with task and project relations to verify ownership chain
  const history = await MyGlobal.prisma.erp_hrm_task_histories.findFirst({
    where: {
      id: props.historyId,
      erp_hrm_task_id: props.taskId,
      task: {
        erp_hrm_project_id: props.projectId,
      },
    },
    select: {
      id: true,
      previous_status: true,
      new_status: true,
      created_at: true,
      task: {
        select: {
          id: true,
          erp_hrm_project_id: true,
          project: {
            select: {
              id: true,
              erp_hrm_organization_id: true,
            },
          },
        },
      },
      member: ErpHrmMemberAtSummaryTransformer.select(),
    },
  });
  // If history not found or doesn't match task/project, throw 404
  if (!history || history.task.erp_hrm_project_id !== props.projectId) {
    throw new HttpException("Not Found", 404);
  }
  // Authorization: Verify admin is the owner of the organization
  const organization = await MyGlobal.prisma.erp_hrm_organizations.findFirst({
    where: {
      id: history.task.project.erp_hrm_organization_id,
    },
    select: {
      id: true,
      owner_id: true,
    },
  });
  if (!organization || organization.owner_id !== props.admin.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ErpHrmTaskHistoryTransformer.transform(history);
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
// import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getErpHrmAdminProjectsProjectIdTasksTaskIdHistoriesHistoryId(props: {
//   admin: AdminPayload;
//   projectId: string & tags.Format<"uuid">;
//   taskId: string & tags.Format<"uuid">;
//   historyId: string & tags.Format<"uuid">;
// }): Promise<IErpHrmTaskHistory> {
//   const record = await MyGlobal.prisma.erp_hrm_task_histories.findFirstOrThrow({
//     ...ErpHrmTaskHistoryTransformer.select(),
//     where: { ... },
//   });
//   return await ErpHrmTaskHistoryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
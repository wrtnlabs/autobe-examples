import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<void> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization context selected", 400);
  }
  const organizationId: string = session.erp_hrm_organization_id;
  await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
      organization_id: organizationId,
      deleted_at: null,
    },
    select: { id: true },
  });
  const timelogCount: number = await MyGlobal.prisma.erp_hrm_timelogs.count({
    where: {
      project_id: props.projectId,
      deleted_at: null,
    },
  });
  if (timelogCount > 0) {
    throw new HttpException(
      "Cannot delete project: all timelogs must be removed before the project can be deleted",
      409,
    );
  }
  const tasks = await MyGlobal.prisma.erp_hrm_tasks.findMany({
    where: { erp_hrm_project_id: props.projectId },
    select: { id: true },
  });
  const taskIds: string[] = tasks.map((t: { id: string }) => t.id);
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (taskIds.length > 0) {
      await tx.erp_hrm_task_histories.deleteMany({
        where: { erp_hrm_task_id: { in: taskIds } },
      });
    }
    await tx.erp_hrm_tasks.deleteMany({
      where: { erp_hrm_project_id: props.projectId },
    });
    await tx.erp_hrm_project_members.deleteMany({
      where: { erp_hrm_project_id: props.projectId },
    });
    const now = new Date().toISOString();
    await tx.erp_hrm_projects.update({
      where: { id: props.projectId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteErpHrmMemberProjectsProjectId(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------
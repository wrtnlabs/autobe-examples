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

export async function deleteErpHrmMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findFirstOrThrow({
      where: {
        id: props.member.session_id,
        erp_hrm_member_id: props.member.id,
      },
      select: {
        erp_hrm_organization_id: true,
      },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization context", 400);
  }
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
    },
  });
  const role = await MyGlobal.prisma.erp_hrm_roles.findFirstOrThrow({
    where: {
      id: employee.erp_hrm_role_id,
      deleted_at: null,
    },
    select: {
      name: true,
      is_builtin: true,
    },
  });
  const hasProjectManage: boolean = role.is_builtin
    ? role.name === "Owner" || role.name === "Manager"
    : (await MyGlobal.prisma.erp_hrm_role_permissions.count({
        where: {
          erp_hrm_role_id: employee.erp_hrm_role_id,
          permission: { key: "project:manage" },
        },
      })) > 0;
  if (!hasProjectManage) {
    throw new HttpException("Forbidden", 403);
  }
  const task = await MyGlobal.prisma.erp_hrm_tasks.findFirstOrThrow({
    where: {
      id: props.taskId,
      erp_hrm_project_id: props.projectId,
    },
    select: {
      deleted_at: true,
    },
  });
  if (task.deleted_at !== null) {
    throw new HttpException("Task already deleted", 409);
  }
  const now = new Date().toISOString();
  await MyGlobal.prisma.erp_hrm_tasks.update({
    where: { id: props.taskId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
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
// export async function deleteErpHrmMemberProjectsProjectIdTasksTaskId(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   taskId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------
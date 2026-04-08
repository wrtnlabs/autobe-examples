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

export async function deleteHrmPlatformMemberTasksTaskId(props: {
  member: MemberPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch task with project and organization info
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      deleted_at: null,
    },
    select: {
      id: true,
      project_id: true,
      project: {
        select: {
          id: true,
          organization_id: true,
        },
      },
    },
  });
  // Find the member's employee record in the organization that owns the project
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_member_id: props.member.id,
      hrm_platform_organization_id: task.project.organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("You're not an employee in this organization", 403);
  }
  // Fetch role with permissions
  const role = await MyGlobal.prisma.hrm_platform_roles.findFirst({
    where: {
      id: employee.hrm_platform_role_id,
      deleted_at: null,
    },
    select: {
      id: true,
      permissions: {
        select: {
          code: true,
        },
      },
    },
  });
  if (!role) {
    throw new HttpException("Role not found", 403);
  }
  // Check for project:manage permission
  const hasManagePermission = role.permissions.some(
    (p) => p.code === "project:manage",
  );
  if (!hasManagePermission) {
    throw new HttpException("You lack project:manage permission", 403);
  }
  // Delete the task (cascade handles task_histories and child tasks)
  await MyGlobal.prisma.hrm_platform_tasks.delete({
    where: {
      id: props.taskId,
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
// export async function deleteHrmPlatformMemberTasksTaskId(props: {
//   member: MemberPayload;
//   taskId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------
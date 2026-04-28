import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimerTransformer } from "../transformers/HrmPlatformTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimer.IUpdate;
}): Promise<IHrmPlatformTimer> {
  // Fetch timer with authorization data
  const timer = await MyGlobal.prisma.hrm_platform_timers.findFirst({
    where: {
      id: props.timerId,
    },
    select: {
      id: true,
      stopped_at: true,
      deleted_at: true,
      hrm_platform_projects_id: true,
      employee: {
        select: {
          hrm_platform_organization_id: true,
          member: {
            select: {
              id: true,
            },
          },
          role: {
            select: {
              rolePermissions: {
                where: {
                  permission_key: "time:manage",
                },
                select: {
                  permission_key: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (timer === null) {
    throw new HttpException("Timer not found", 404);
  }
  // Validate timer is active
  if (timer.stopped_at !== null || timer.deleted_at !== null) {
    throw new HttpException("Timer is not active", 400);
  }
  // Authorize: must be timer's employee OR have time:manage permission
  const isOwner = timer.employee.member.id === props.member.id;
  const hasPermission = timer.employee.role.rolePermissions.length > 0;
  if (!isOwner && !hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate projectId if provided
  if (props.body.projectId !== undefined) {
    const project = await MyGlobal.prisma.hrm_platform_projects.findFirst({
      where: {
        id: props.body.projectId,
        hrm_platform_organization_id:
          timer.employee.hrm_platform_organization_id,
        status: "Active",
        deleted_at: null,
      },
    });
    if (project === null) {
      throw new HttpException("Invalid project", 400);
    }
  }
  // Validate taskId if provided
  if (props.body.taskId !== undefined) {
    if (props.body.taskId !== null) {
      const targetProjectId =
        props.body.projectId ?? timer.hrm_platform_projects_id;
      const task = await MyGlobal.prisma.hrm_platform_tasks.findFirst({
        where: {
          id: props.body.taskId,
          hrm_platform_project_id: targetProjectId,
          deleted_at: null,
        },
      });
      if (task === null) {
        throw new HttpException("Invalid task", 400);
      }
    }
  }
  // Update timer
  await MyGlobal.prisma.hrm_platform_timers.update({
    where: {
      id: props.timerId,
    },
    data: {
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.billable !== undefined && {
        billable: props.body.billable,
      }),
      ...(props.body.projectId !== undefined && {
        hrm_platform_projects_id: props.body.projectId,
      }),
      ...(props.body.taskId !== undefined && {
        hrm_platform_tasks_id: props.body.taskId,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch and transform the updated timer
  const updated = await MyGlobal.prisma.hrm_platform_timers.findUniqueOrThrow({
    where: {
      id: props.timerId,
    },
    ...HrmPlatformTimerTransformer.select(),
  });
  return await HrmPlatformTimerTransformer.transform(updated);
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
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmPlatformMemberTimersTimerId(props: {
//   member: MemberPayload;
//   timerId: string & tags.Format<"uuid">;
//   body: IHrmPlatformTimer.IUpdate;
// }): Promise<IHrmPlatformTimer> {
//   await MyGlobal.prisma.hrm_platform_timers.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_platform_timers.findUniqueOrThrow({
//     where: { ... },
//     ...HrmPlatformTimerTransformer.select(),
//   });
//   return await HrmPlatformTimerTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------
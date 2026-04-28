import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTaskTransformer } from "../transformers/HrmPlatformTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IHrmPlatformTask.IUpdate;
}): Promise<IHrmPlatformTask> {
  await MyGlobal.prisma.hrm_platform_tasks.findFirstOrThrow({
    where: {
      id: props.taskId,
      hrm_platform_project_id: props.projectId,
    },
    select: {
      id: true,
    },
  });
  if (
    props.body.hrmPlatformEmployeeId !== undefined &&
    props.body.hrmPlatformEmployeeId !== null
  ) {
    const membership =
      await MyGlobal.prisma.hrm_platform_project_memberships.findFirst({
        where: {
          hrm_platform_employee_id: props.body.hrmPlatformEmployeeId,
          hrm_platform_project_id: props.projectId,
        },
        select: {
          id: true,
        },
      });
    if (membership === null) {
      throw new HttpException("Employee is not a member of the project", 400);
    }
  }
  if (props.body.parentId !== undefined && props.body.parentId !== null) {
    const parentTask = await MyGlobal.prisma.hrm_platform_tasks.findFirst({
      where: {
        id: props.body.parentId,
        hrm_platform_project_id: props.projectId,
      },
      select: {
        id: true,
      },
    });
    if (parentTask === null) {
      throw new HttpException(
        "Parent task does not exist or does not belong to the same project",
        400,
      );
    }
  }
  await MyGlobal.prisma.hrm_platform_tasks.update({
    where: {
      id: props.taskId,
    },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.priority !== undefined && {
        priority: props.body.priority,
      }),
      ...(props.body.estimatedHours !== undefined && {
        estimated_hours: props.body.estimatedHours,
      }),
      ...(props.body.dueAt !== undefined && { due_at: props.body.dueAt }),
      ...(props.body.hrmPlatformEmployeeId !== undefined && {
        assignedEmployee:
          props.body.hrmPlatformEmployeeId !== null
            ? { connect: { id: props.body.hrmPlatformEmployeeId } }
            : { disconnect: true },
      }),
      ...(props.body.parentId !== undefined && {
        parentTask:
          props.body.parentId !== null
            ? { connect: { id: props.body.parentId } }
            : { disconnect: true },
      }),
    },
  });
  const updated = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
    },
    ...HrmPlatformTaskTransformer.select(),
  });
  return await HrmPlatformTaskTransformer.transform(updated);
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
// import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmPlatformMemberProjectsProjectIdTasksTaskId(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   taskId: string & tags.Format<"uuid">;
//   body: IHrmPlatformTask.IUpdate;
// }): Promise<IHrmPlatformTask> {
//   await MyGlobal.prisma.hrm_platform_tasks.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
//     where: { ... },
//     ...HrmPlatformTaskTransformer.select(),
//   });
//   return await HrmPlatformTaskTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------
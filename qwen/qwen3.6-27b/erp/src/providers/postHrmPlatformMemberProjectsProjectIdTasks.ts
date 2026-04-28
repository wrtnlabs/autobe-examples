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
import { HrmPlatformTaskCollector } from "../collectors/HrmPlatformTaskCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTaskTransformer } from "../transformers/HrmPlatformTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformTask.ICreate;
}): Promise<IHrmPlatformTask> {
  // 1. Verify project exists and retrieve organization context
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      select: {
        id: true,
        hrm_platform_organization_id: true,
      },
    },
  );
  // 2. Verify member has active project membership
  const membership =
    await MyGlobal.prisma.hrm_platform_project_memberships.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        employee: {
          hrm_platform_member_id: props.member.id,
        },
        deleted_at: null,
      },
    });
  if (membership === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate assigned_employee_id if provided
  if (props.body.assigned_employee_id !== undefined) {
    const employee = await MyGlobal.prisma.hrm_platform_employees.findUnique({
      where: { id: props.body.assigned_employee_id },
      select: {
        id: true,
        hrm_platform_organization_id: true,
        status: true,
      },
    });
    if (employee === null) {
      throw new HttpException("Employee not found", 404);
    }
    if (
      employee.hrm_platform_organization_id !==
      project.hrm_platform_organization_id
    ) {
      throw new HttpException(
        "Employee must belong to the same organization",
        400,
      );
    }
    if (employee.status !== "active") {
      throw new HttpException("Assigned employee must be active", 400);
    }
    const employeeProjectMembership =
      await MyGlobal.prisma.hrm_platform_project_memberships.findFirst({
        where: {
          hrm_platform_employee_id: props.body.assigned_employee_id,
          hrm_platform_project_id: props.projectId,
          deleted_at: null,
        },
      });
    if (employeeProjectMembership === null) {
      throw new HttpException(
        "Assigned employee must be a project member",
        400,
      );
    }
  }
  // 4. Validate parent_id if provided — enforce one-level nesting only
  if (props.body.parent_id !== undefined) {
    const parentTask = await MyGlobal.prisma.hrm_platform_tasks.findUnique({
      where: { id: props.body.parent_id },
      select: {
        id: true,
        hrm_platform_project_id: true,
        parent_id: true,
      },
    });
    if (parentTask === null) {
      throw new HttpException("Parent task not found", 404);
    }
    if (parentTask.hrm_platform_project_id !== props.projectId) {
      throw new HttpException(
        "Parent task must belong to the same project",
        400,
      );
    }
    if (parentTask.parent_id !== null) {
      throw new HttpException(
        "One-level nesting only — parent task cannot have its own parent",
        400,
      );
    }
  }
  // 5. Create task with collector + transformer
  const record = await MyGlobal.prisma.hrm_platform_tasks.create({
    data: await HrmPlatformTaskCollector.collect({
      body: props.body,
      hrmPlatformProjects: project,
    }),
    ...HrmPlatformTaskTransformer.select(),
  });
  return await HrmPlatformTaskTransformer.transform(record);
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
// export async function postHrmPlatformMemberProjectsProjectIdTasks(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   body: IHrmPlatformTask.ICreate;
// }): Promise<IHrmPlatformTask> {
//   const record = await MyGlobal.prisma.hrm_platform_tasks.create({
//     data: await HrmPlatformTaskCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmPlatformTaskTransformer.select(),
//   });
//   return await HrmPlatformTaskTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingTimelogCollector } from "../collectors/HrmTimeTrackingTimelogCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTimelogTransformer } from "../transformers/HrmTimeTrackingTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberTimelogs(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingTimelog.ICreate;
}): Promise<IHrmTimeTrackingTimelog> {
  // 1. Find the employee record for this member (must be active, not deleted)
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      status: "active",
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_tracking_organization_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found or not active", 403);
  }
  // 2. Find the project (must exist, be active, and belong to same org as employee)
  const project =
    await MyGlobal.prisma.hrm_time_tracking_projects.findUniqueOrThrow({
      where: { id: props.body.project_id },
      select: {
        id: true,
        status: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  if (project.status !== "active") {
    throw new HttpException("Project is not active", 400);
  }
  // 3. Verify project belongs to the same organization as the employee
  if (
    project.hrm_time_tracking_organization_id !==
    employee.hrm_time_tracking_organization_id
  ) {
    throw new HttpException(
      "Project does not belong to the same organization",
      403,
    );
  }
  // 4. Verify employee is a project member (active, not soft-deleted)
  const projectMember =
    await MyGlobal.prisma.hrm_time_tracking_project_members.findFirst({
      where: {
        hrm_time_tracking_project_id: props.body.project_id,
        hrm_time_tracking_employee_id: employee.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (projectMember === null) {
    throw new HttpException("Employee is not a member of this project", 403);
  }
  // 5. If task_id is provided, verify it belongs to the same project and is not deleted
  if (props.body.task_id !== null && props.body.task_id !== undefined) {
    const task = await MyGlobal.prisma.hrm_time_tracking_tasks.findFirst({
      where: {
        id: props.body.task_id,
        hrm_time_tracking_project_id: props.body.project_id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (task === null) {
      throw new HttpException(
        "Task not found, does not belong to the specified project, or is deleted",
        404,
      );
    }
  }
  // 6. Create the timelog using the Collector + Transformer
  const record = await MyGlobal.prisma.hrm_time_tracking_timelogs.create({
    data: await HrmTimeTrackingTimelogCollector.collect({
      body: props.body,
      hrmTimeTrackingEmployees: { id: employee.id },
      hrmTimeTrackingMemberSessions: { id: props.member.session_id },
    }),
    ...HrmTimeTrackingTimelogTransformer.select(),
  });
  return await HrmTimeTrackingTimelogTransformer.transform(record);
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
// import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
// import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
// import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
// import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmTimeTrackingMemberTimelogs(props: {
//   member: MemberPayload;
//   body: IHrmTimeTrackingTimelog.ICreate;
// }): Promise<IHrmTimeTrackingTimelog> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_timelogs.create({
//     data: await HrmTimeTrackingTimelogCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmTimeTrackingTimelogTransformer.select(),
//   });
//   return await HrmTimeTrackingTimelogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
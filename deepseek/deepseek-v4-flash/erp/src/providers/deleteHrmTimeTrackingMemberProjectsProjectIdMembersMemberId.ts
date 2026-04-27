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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteHrmTimeTrackingMemberProjectsProjectIdMembersMemberId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the project to determine its organization
  const project =
    await MyGlobal.prisma.hrm_time_tracking_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      select: { hrm_time_tracking_organization_id: true },
    });
  // 2. Find the requesting member's active employee record in this organization
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      hrm_time_tracking_organization_id:
        project.hrm_time_tracking_organization_id,
      deleted_at: null,
    },
    select: { hrm_time_tracking_role_id: true },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Check the employee's role has `employee:manage` permission [ID:502]
  const permission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
        permission_code: "employee:manage",
        deleted_at: null,
      },
    });
  if (permission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Find the project member — must exist and not already soft-deleted [ID:287]
  const projectMember =
    await MyGlobal.prisma.hrm_time_tracking_project_members.findFirst({
      where: {
        id: props.memberId,
        hrm_time_tracking_project_id: props.projectId,
        deleted_at: null,
      },
      select: { hrm_time_tracking_employee_id: true },
    });
  if (projectMember === null) {
    throw new HttpException(
      "The specified employee is not a member of this project",
      404,
    );
  }
  // 5. Soft-delete the project member record
  await MyGlobal.prisma.hrm_time_tracking_project_members.update({
    where: { id: props.memberId },
    data: { deleted_at: new Date() },
  });
  // 6. Clear task assignments for open/in-progress tasks in this project
  //    that are assigned to the removed employee
  await MyGlobal.prisma.hrm_time_tracking_tasks.updateMany({
    where: {
      hrm_time_tracking_project_id: props.projectId,
      hrm_time_tracking_employee_id:
        projectMember.hrm_time_tracking_employee_id,
      status: { notIn: ["completed", "closed"] },
      deleted_at: null,
    },
    data: { hrm_time_tracking_employee_id: null },
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
// export async function deleteHrmTimeTrackingMemberProjectsProjectIdMembersMemberId(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   memberId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------
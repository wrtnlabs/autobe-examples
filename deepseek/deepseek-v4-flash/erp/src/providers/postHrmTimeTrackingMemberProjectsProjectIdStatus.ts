import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingProjectTransformer } from "../transformers/HrmTimeTrackingProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberProjectsProjectIdStatus(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingProject.IUpdate;
}): Promise<IHrmTimeTrackingProject> {
  // Validate that status is provided and is a valid transition target
  if (props.body.status === undefined) {
    throw new HttpException("Status is required", 400);
  }
  if (props.body.status !== "archived" && props.body.status !== "completed") {
    throw new HttpException(
      "Project status can only transition to 'archived' or 'completed'",
      400,
    );
  }
  // Look up the project — must exist and not be soft-deleted
  const project =
    await MyGlobal.prisma.hrm_time_tracking_projects.findFirstOrThrow({
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        status: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  // Validate that the project is currently active
  if (project.status !== "active") {
    throw new HttpException(
      "Only active projects can transition to a new status",
      400,
    );
  }
  // Permission check: member must be an employee in the project's organization
  // with a role that has the `project:manage` permission
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      hrm_time_tracking_organization_id:
        project.hrm_time_tracking_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_tracking_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException(
      "You are not an employee in this organization",
      403,
    );
  }
  const permission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
        permission_code: "project:manage",
        deleted_at: null,
      },
    });
  if (permission === null) {
    throw new HttpException(
      "You do not have the project:manage permission",
      403,
    );
  }
  // Update the project status
  await MyGlobal.prisma.hrm_time_tracking_projects.update({
    where: { id: props.projectId },
    data: {
      status: props.body.status,
      updated_at: new Date(),
    },
  });
  // Look up the activity log type based on the new status
  const logTypeCode =
    props.body.status === "archived" ? "project.archived" : "project.completed";
  const logType =
    await MyGlobal.prisma.hrm_time_tracking_activity_log_types.findFirstOrThrow(
      {
        where: {
          code: logTypeCode,
          deleted_at: null,
        },
        select: { id: true },
      },
    );
  // Create an activity log entry recording the status change
  await MyGlobal.prisma.hrm_time_tracking_activity_logs.create({
    data: {
      id: v4(),
      hrm_time_tracking_organization_id:
        project.hrm_time_tracking_organization_id,
      hrm_time_tracking_member_id: props.member.id,
      hrm_time_tracking_activity_log_type_id: logType.id,
      target_entity_type: "Project",
      target_entity_id: props.projectId,
      target_entity_name: project.name,
      details: `Status changed from ${project.status} to ${props.body.status}`,
      created_at: new Date(),
    },
  });
  // Fetch and return the fully updated project via the transformer
  const record =
    await MyGlobal.prisma.hrm_time_tracking_projects.findFirstOrThrow({
      where: { id: props.projectId },
      ...HrmTimeTrackingProjectTransformer.select(),
    });
  return await HrmTimeTrackingProjectTransformer.transform(record);
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
// import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
// import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
// import { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
// import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
// import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
// import { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmTimeTrackingMemberProjectsProjectIdStatus(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingProject.IUpdate;
// }): Promise<IHrmTimeTrackingProject> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_projects.findFirstOrThrow({
//     ...HrmTimeTrackingProjectTransformer.select(),
//     where: { ... },
//   });
//   return await HrmTimeTrackingProjectTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
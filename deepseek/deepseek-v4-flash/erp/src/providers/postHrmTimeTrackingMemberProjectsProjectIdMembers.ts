import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingProjectMemberCollector } from "../collectors/HrmTimeTrackingProjectMemberCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingProjectMemberTransformer } from "../transformers/HrmTimeTrackingProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingProjectMember.ICreate;
}): Promise<IHrmTimeTrackingProjectMember> {
  // 1. Validate project exists and is not soft-deleted
  const project = await MyGlobal.prisma.hrm_time_tracking_projects.findFirst({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_tracking_organization_id: true,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  // 2. Verify the authenticated member belongs to the project's organization
  const memberEmployee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
      where: {
        hrm_time_tracking_member_id: props.member.id,
        hrm_time_tracking_organization_id:
          project.hrm_time_tracking_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (memberEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate target employee exists, is not soft-deleted, and belongs to same organization
  const targetEmployee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
      where: {
        id: props.body.employee_id,
        hrm_time_tracking_organization_id:
          project.hrm_time_tracking_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (targetEmployee === null) {
    throw new HttpException("Employee not found", 404);
  }
  // 4. Check composite unique constraint (project_id + employee_id)
  const existingMember =
    await MyGlobal.prisma.hrm_time_tracking_project_members.findFirst({
      where: {
        hrm_time_tracking_project_id: props.projectId,
        hrm_time_tracking_employee_id: props.body.employee_id,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  // 5. Handle existing membership
  if (existingMember !== null) {
    if (existingMember.deleted_at === null) {
      // Active membership — conflict
      throw new HttpException(
        "Employee is already a member of this project",
        409,
      );
    }
    // Soft-deleted — restore and update role
    const restored =
      await MyGlobal.prisma.hrm_time_tracking_project_members.update({
        where: { id: existingMember.id },
        data: {
          role: props.body.role,
          updated_at: new Date(),
          deleted_at: null,
        },
        ...HrmTimeTrackingProjectMemberTransformer.select(),
      });
    return await HrmTimeTrackingProjectMemberTransformer.transform(restored);
  }
  // 6. Create new membership using Collector
  const record = await MyGlobal.prisma.hrm_time_tracking_project_members.create(
    {
      data: await HrmTimeTrackingProjectMemberCollector.collect({
        body: props.body,
        hrmTimeTrackingProjects: { id: props.projectId },
      }),
      ...HrmTimeTrackingProjectMemberTransformer.select(),
    },
  );
  return await HrmTimeTrackingProjectMemberTransformer.transform(record);
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
// import { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
// import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmTimeTrackingMemberProjectsProjectIdMembers(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingProjectMember.ICreate;
// }): Promise<IHrmTimeTrackingProjectMember> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_project_members.create({
//     data: await HrmTimeTrackingProjectMemberCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmTimeTrackingProjectMemberTransformer.select(),
//   });
//   return await HrmTimeTrackingProjectMemberTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
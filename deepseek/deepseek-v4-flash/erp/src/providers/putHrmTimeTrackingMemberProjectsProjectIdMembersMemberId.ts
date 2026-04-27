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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingProjectMemberTransformer } from "../transformers/HrmTimeTrackingProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingMemberProjectsProjectIdMembersMemberId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingProjectMember.IUpdate;
}): Promise<IHrmTimeTrackingProjectMember> {
  // 1. Verify the project exists and is active
  const project =
    await MyGlobal.prisma.hrm_time_tracking_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      select: {
        id: true,
        status: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  if (project.status !== "active") {
    throw new HttpException(
      "Cannot update project member role on a non-active project",
      422,
    );
  }
  // 2. Find the requesting member's employee record in this organization
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
    throw new HttpException("Forbidden", 403);
  }
  // 3. Check if the employee's role has project:manage permission
  const permission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
        permission_code: "project:manage",
        deleted_at: null,
      },
    });
  if (permission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Verify the project member record exists, belongs to this project, and is not soft-deleted
  const memberRecord =
    await MyGlobal.prisma.hrm_time_tracking_project_members.findFirst({
      where: {
        id: props.memberId,
        hrm_time_tracking_project_id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (memberRecord === null) {
    throw new HttpException("Project member not found", 404);
  }
  // 5. Update only the role field — `new Date().toISOString()` produces a string,
  //    which Prisma accepts for DateTime fields (string | Date)
  await MyGlobal.prisma.hrm_time_tracking_project_members.update({
    where: { id: props.memberId },
    data: {
      role: props.body.role,
      updated_at: new Date().toISOString(),
    },
  });
  // 6. Return the full updated record using the transformer
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_project_members.findUniqueOrThrow({
      where: { id: props.memberId },
      ...HrmTimeTrackingProjectMemberTransformer.select(),
    });
  return await HrmTimeTrackingProjectMemberTransformer.transform(updated);
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
// export async function putHrmTimeTrackingMemberProjectsProjectIdMembersMemberId(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   memberId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingProjectMember.IUpdate;
// }): Promise<IHrmTimeTrackingProjectMember> {
//   await MyGlobal.prisma.hrm_time_tracking_project_members.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_time_tracking_project_members.findUniqueOrThrow({
//     where: { ... },
//     ...HrmTimeTrackingProjectMemberTransformer.select(),
//   });
//   return await HrmTimeTrackingProjectMemberTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------
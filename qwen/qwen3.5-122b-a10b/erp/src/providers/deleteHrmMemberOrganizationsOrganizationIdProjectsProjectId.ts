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

export async function deleteHrmMemberOrganizationsOrganizationIdProjectsProjectId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  projectId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Validate project exists and belongs to the organization
  await MyGlobal.prisma.hrm_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
      hrm_organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  // Step 2: Check for associated timelogs - deletion blocked if any exist
  const timelogs = await MyGlobal.prisma.hrm_timelogs.findMany({
    where: {
      hrm_project_id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (timelogs.length > 0) {
    throw new HttpException(
      "Cannot delete project with associated timelogs",
      409,
    );
  }
  // Step 3: Cascade delete - delete all tasks associated with the project
  await MyGlobal.prisma.hrm_tasks.deleteMany({
    where: {
      project_id: props.projectId,
      deleted_at: null,
    },
  });
  // Step 4: Cascade delete - delete all project member assignments
  await MyGlobal.prisma.hrm_project_members.deleteMany({
    where: {
      project_id: props.projectId,
      deleted_at: null,
    },
  });
  // Step 5: Soft delete the project by setting deleted_at timestamp
  const deletedAt = new Date().toISOString();
  await MyGlobal.prisma.hrm_projects.update({
    where: {
      id: props.projectId,
    },
    data: {
      deleted_at: deletedAt,
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
// export async function deleteHrmMemberOrganizationsOrganizationIdProjectsProjectId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   projectId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------
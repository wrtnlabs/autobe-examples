import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectTransformer } from "../transformers/HrmPlatformProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformProject.IUpdate;
}): Promise<IHrmPlatformProject> {
  // Find the existing project to validate it exists and isn't soft-deleted
  const existingProject =
    await MyGlobal.prisma.hrm_platform_projects.findUnique({
      where: { id: props.projectId },
      select: {
        id: true,
        organization_id: true,
        deleted_at: true,
      },
    });
  if (existingProject === null || existingProject.deleted_at !== null) {
    throw new HttpException("Project not found", 404);
  }
  // Check for name uniqueness if name is being updated
  if (props.body.name !== undefined) {
    const nameConflict = await MyGlobal.prisma.hrm_platform_projects.findFirst({
      where: {
        organization_id: existingProject.organization_id,
        name: props.body.name,
        id: { not: props.projectId },
        deleted_at: null,
      },
    });
    if (nameConflict !== null) {
      throw new HttpException("Project name already exists", 409);
    }
  }
  // Validate color code format if provided
  if (props.body.color_code !== undefined) {
    const colorCode = props.body.color_code;
    if (!/^#[0-9A-F]{6}$/i.test(colorCode)) {
      throw new HttpException("Invalid color code format", 422);
    }
  }
  // Update the project with all relations
  const updatedProject = await MyGlobal.prisma.hrm_platform_projects.update({
    where: { id: props.projectId },
    data: {
      updated_at: new Date(),
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.color_code !== undefined && {
        color_code: props.body.color_code,
      }),
      ...(props.body.budget_hours !== undefined && {
        budget_hours: props.body.budget_hours,
      }),
      ...(props.body.start_date !== undefined && {
        start_date:
          props.body.start_date !== null
            ? new Date(props.body.start_date)
            : null,
      }),
      ...(props.body.end_date !== undefined && {
        end_date:
          props.body.end_date !== null ? new Date(props.body.end_date) : null,
      }),
    },
    select: {
      ...HrmPlatformProjectTransformer.select().select,
    },
  });
  // Transform and return
  return await HrmPlatformProjectTransformer.transform(updatedProject);
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
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
// import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
// import { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmPlatformMemberProjectsProjectId(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   body: IHrmPlatformProject.IUpdate;
// }): Promise<IHrmPlatformProject> {
//   await MyGlobal.prisma.hrm_platform_projects.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
//     where: { ... },
//     ...HrmPlatformProjectTransformer.select(),
//   });
//   return await HrmPlatformProjectTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------
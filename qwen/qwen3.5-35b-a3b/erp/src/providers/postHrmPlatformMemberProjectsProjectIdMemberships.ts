import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformProjectMembershipCollector } from "../collectors/HrmPlatformProjectMembershipCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectMembershipTransformer } from "../transformers/HrmPlatformProjectMembershipTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberProjectsProjectIdMemberships(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformProjectMembership.ICreate;
}): Promise<IHrmPlatformProjectMembership> {
  // 1. Validate project exists and is not soft-deleted
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
        deleted_at: null,
      },
    },
  );
  // 2. Validate employee exists and is not soft-deleted
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: {
        id: props.body.employee_id,
        deleted_at: null,
      },
    });
  // 3. Verify employee belongs to same organization as project
  if (employee.hrm_platform_organization_id !== project.organization_id) {
    throw new HttpException(
      "Employee does not belong to the same organization as the project",
      400,
    );
  }
  // 4. Check for existing active membership (unique constraint on employee_id + project_id)
  const existingMembership =
    await MyGlobal.prisma.hrm_platform_project_memberships.findFirst({
      where: {
        hrm_platform_employee_id: props.body.employee_id,
        hrm_platform_project_id: props.projectId,
        deleted_at: null,
      },
    });
  // 5. If duplicate detected, reject with 409 Conflict
  if (existingMembership !== null) {
    throw new HttpException(
      "Employee is already assigned to this project",
      409,
    );
  }
  // 6. Create membership record
  const created = await MyGlobal.prisma.hrm_platform_project_memberships.create(
    {
      data: await HrmPlatformProjectMembershipCollector.collect({
        body: props.body,
        hrmPlatformProjects: {
          id: project.id,
        },
        hrmPlatformOrganizations: {
          id: project.organization_id,
        },
      }),
      ...HrmPlatformProjectMembershipTransformer.select(),
    },
  );
  // 7. Return transformed membership
  return await HrmPlatformProjectMembershipTransformer.transform(created);
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
// import { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmPlatformMemberProjectsProjectIdMemberships(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   body: IHrmPlatformProjectMembership.ICreate;
// }): Promise<IHrmPlatformProjectMembership> {
//   const record = await MyGlobal.prisma.hrm_platform_project_memberships.create({
//     data: await HrmPlatformProjectMembershipCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmPlatformProjectMembershipTransformer.select(),
//   });
//   return await HrmPlatformProjectMembershipTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
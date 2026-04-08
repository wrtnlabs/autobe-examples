import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmProjectTransformer } from "../transformers/HrmProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmMemberOrganizationsOrganizationCodeProjectsProjectId(props: {
  member: MemberPayload;
  organizationCode: string & tags.Format<"uuid">;
  projectId: string & tags.Format<"uuid">;
}): Promise<IHrmProject> {
  const organization = await MyGlobal.prisma.hrm_organizations.findFirst({
    where: {
      id: props.organizationCode,
      deleted_at: null,
    },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  const project = await MyGlobal.prisma.hrm_projects.findFirst({
    where: {
      id: props.projectId,
      hrm_organization_id: organization.id,
      deleted_at: null,
    },
    ...HrmProjectTransformer.select(),
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: organization.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Access denied", 403);
  }
  const projectMember = await MyGlobal.prisma.hrm_project_members.findFirst({
    where: {
      project_id: props.projectId,
      employee_id: employee.id,
      deleted_at: null,
    },
  });
  if (projectMember === null) {
    throw new HttpException("Access denied", 403);
  }
  return await HrmProjectTransformer.transform(project);
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
// import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmMemberOrganizationsOrganizationCodeProjectsProjectId(props: {
//   member: MemberPayload;
//   organizationCode: string;
//   projectId: string & tags.Format<"uuid">;
// }): Promise<IHrmProject> {
//   const record = await MyGlobal.prisma.hrm_projects.findFirstOrThrow({
//     ...HrmProjectTransformer.select(),
//     where: { ... },
//   });
//   return await HrmProjectTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
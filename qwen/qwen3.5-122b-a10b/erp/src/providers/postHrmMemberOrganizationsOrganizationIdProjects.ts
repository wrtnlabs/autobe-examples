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
import { HrmProjectCollector } from "../collectors/HrmProjectCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmProjectTransformer } from "../transformers/HrmProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmMemberOrganizationsOrganizationIdProjects(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmProject.ICreate;
}): Promise<IHrmProject> {
  const organization = await MyGlobal.prisma.hrm_organizations.findUnique({
    where: { id: props.organizationId },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  const existingProject = await MyGlobal.prisma.hrm_projects.findFirst({
    where: {
      hrm_organization_id: props.organizationId,
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existingProject !== null) {
    throw new HttpException(
      "Project name already exists in this organization",
      409,
    );
  }
  const record = await MyGlobal.prisma.hrm_projects.create({
    data: await HrmProjectCollector.collect({
      body: props.body,
      hrmOrganizations: organization,
    }),
    ...HrmProjectTransformer.select(),
  });
  return await HrmProjectTransformer.transform(record);
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
// export async function postHrmMemberOrganizationsOrganizationIdProjects(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmProject.ICreate;
// }): Promise<IHrmProject> {
//   const record = await MyGlobal.prisma.hrm_projects.create({
//     data: await HrmProjectCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmProjectTransformer.select(),
//   });
//   return await HrmProjectTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmProjectMemberCollector } from "../collectors/HrmProjectMemberCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmProjectMemberTransformer } from "../transformers/HrmProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmProjectMember.ICreate;
}): Promise<IHrmProjectMember> {
  // Validate project exists and is active
  const project = await MyGlobal.prisma.hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true, status: true, hrm_organization_id: true },
  });
  if (project.status !== "active") {
    throw new HttpException("Project is not active", 400);
  }
  // Validate employee exists and is active in same organization
  const employee = await MyGlobal.prisma.hrm_employees.findFirstOrThrow({
    where: {
      id: props.body.employee_id,
      organization_id: project.hrm_organization_id,
      status: "active",
    },
  });
  // Create project membership using collector
  const record = await MyGlobal.prisma.hrm_project_members.create({
    data: await HrmProjectMemberCollector.collect({
      body: props.body,
      project: { id: project.id },
    }),
    ...HrmProjectMemberTransformer.select(),
  });
  return await HrmProjectMemberTransformer.transform(record);
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
// import { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
// import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmMemberProjectsProjectIdMembers(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   body: IHrmProjectMember.ICreate;
// }): Promise<IHrmProjectMember> {
//   const record = await MyGlobal.prisma.hrm_project_members.create({
//     data: await HrmProjectMemberCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmProjectMemberTransformer.select(),
//   });
//   return await HrmProjectMemberTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
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

const validStatuses = ["active", "archived", "completed"] as const;
type ValidProjectStatus = (typeof validStatuses)[number];
function isValidProjectStatus(status: string): status is ValidProjectStatus {
  return validStatuses.includes(status as ValidProjectStatus);
}
export async function putHrmMemberOrganizationsOrganizationIdProjectsProjectIdStatus(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  projectId: string & tags.Format<"uuid">;
  body: IHrmProject.IStatusUpdate;
}): Promise<IHrmProject> {
  if (!isValidProjectStatus(props.body.status)) {
    throw new HttpException("Invalid status value", 400);
  }
  await MyGlobal.prisma.hrm_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
      hrm_organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  } satisfies Prisma.hrm_projectsFindUniqueOrThrowArgs);
  await MyGlobal.prisma.hrm_projects.update({
    where: { id: props.projectId },
    data: {
      status: props.body.status,
      updated_at: new Date(),
    },
  } satisfies Prisma.hrm_projectsUpdateArgs);
  const updated = await MyGlobal.prisma.hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    ...HrmProjectTransformer.select(),
  } satisfies Prisma.hrm_projectsFindUniqueOrThrowArgs);
  return await HrmProjectTransformer.transform(updated);
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
// export async function putHrmMemberOrganizationsOrganizationIdProjectsProjectIdStatus(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   projectId: string & tags.Format<"uuid">;
//   body: IHrmProject.IStatusUpdate;
// }): Promise<IHrmProject> {
//   await MyGlobal.prisma.hrm_projects.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_projects.findUniqueOrThrow({
//     where: { ... },
//     ...HrmProjectTransformer.select(),
//   });
//   return await HrmProjectTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------
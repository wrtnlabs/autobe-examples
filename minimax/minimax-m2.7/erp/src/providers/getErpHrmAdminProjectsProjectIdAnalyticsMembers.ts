import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmProjectMemberAtInvertTransformer } from "../transformers/ErpHrmProjectMemberAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmAdminProjectsProjectIdAnalyticsMembers(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IErpHrmProjectMember.ISummary> {
  await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true },
  });
  const members = await MyGlobal.prisma.erp_hrm_project_members.findMany({
    where: { erp_hrm_project_id: props.projectId },
    ...ErpHrmProjectMemberAtInvertTransformer.select(),
    orderBy: { created_at: "asc" },
  });
  const totalCount = members.length;
  const memberCount = members.filter(
    (m) => m.assigned_role === "member",
  ).length;
  const projectLeadCount = members.filter(
    (m) => m.assigned_role === "project_lead",
  ).length;
  const transformedMembers = await ArrayUtil.asyncMap(
    members,
    ErpHrmProjectMemberAtInvertTransformer.transform,
  );
  return {
    totalCount: totalCount as number & tags.Type<"int32">,
    memberCount: memberCount as number & tags.Type<"int32">,
    projectLeadCount: projectLeadCount as number & tags.Type<"int32">,
    members: transformedMembers as unknown as IErpHrmProjectMember.ISummary[],
  };
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
// import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getErpHrmAdminProjectsProjectIdAnalyticsMembers(props: {
//   admin: AdminPayload;
//   projectId: string & tags.Format<"uuid">;
// }): Promise<IErpHrmProjectMember.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------
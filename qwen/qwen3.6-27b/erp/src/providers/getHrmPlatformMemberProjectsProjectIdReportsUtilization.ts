import { IBudgetUtilization } from "@ORGANIZATION/PROJECT-api/lib/structures/IBudgetUtilization";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { BudgetUtilizationTransformer } from "../transformers/BudgetUtilizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberProjectsProjectIdReportsUtilization(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IBudgetUtilization> {
  // Fetch the project with timelog data required for budget utilization calculation
  const record = await MyGlobal.prisma.hrm_platform_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      ...BudgetUtilizationTransformer.select().select,
      hrm_platform_organization_id: true,
    },
  });
  // Verify the project belongs to the user's active organization context
  // by checking if the member has an active employee record in the same organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_member_id: props.member.id,
      hrm_platform_organization_id: record.hrm_platform_organization_id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform project data into budget utilization response
  // Transformer filters deleted timelogs, computes actualHours and percentageConsumed
  return await BudgetUtilizationTransformer.transform(record);
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
// import { IBudgetUtilization } from "@ORGANIZATION/PROJECT-api/lib/structures/IBudgetUtilization";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberProjectsProjectIdReportsUtilization(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
// }): Promise<IBudgetUtilization> {
//   const record = await MyGlobal.prisma.hrm_platform_projects.findFirstOrThrow({
//     ...BudgetUtilizationTransformer.select(),
//     where: { ... },
//   });
//   return await BudgetUtilizationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
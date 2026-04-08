import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmOrganizationAtSummaryTransformer } from "../transformers/HrmOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmMemberOrganizationsOrganizationIdSwitch(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IHrmOrganization.ISummary> {
  // 1. Verify organization exists and is not soft-deleted
  await MyGlobal.prisma.hrm_organizations.findFirstOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
  });
  // 2. Verify member is an employee of this organization
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // 3. Log the organization switch action
  const now = new Date();
  await MyGlobal.prisma.hrm_activity_logs.create({
    data: {
      id: v4(),
      hrm_members_id: props.member.id,
      action_type: "organization.switch",
      target_entity_type: "Organization",
      target_entity_id: props.organizationId,
      timestamp: now,
      created_at: now,
      updated_at: now,
    },
  });
  // 4. Return organization summary
  const record = await MyGlobal.prisma.hrm_organizations.findUniqueOrThrow({
    where: { id: props.organizationId },
    ...HrmOrganizationAtSummaryTransformer.select(),
  });
  return await HrmOrganizationAtSummaryTransformer.transform(record);
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
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmMemberOrganizationsOrganizationIdSwitch(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
// }): Promise<IHrmOrganization.ISummary> {
//   const record = await MyGlobal.prisma.hrm_organizations.findFirstOrThrow({
//     ...HrmOrganizationAtSummaryTransformer.select(),
//     where: { ... },
//   });
//   return await HrmOrganizationAtSummaryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
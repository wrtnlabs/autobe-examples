import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingOrganizationTransformer } from "../transformers/HrmTimeTrackingOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberSwitchOrganizationOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingOrganization> {
  // 1. Verify the organization exists and is active
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findFirstOrThrow({
      where: {
        id: props.organizationId,
        status: "active",
      },
      ...HrmTimeTrackingOrganizationTransformer.select(),
    });
  // 2. Verify the authenticated member has an active employee record in this organization
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      hrm_time_tracking_organization_id: props.organizationId,
      status: "active",
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("You do not belong to this organization", 403);
  }
  // 3. Return the organization as confirmation (idempotent)
  return await HrmTimeTrackingOrganizationTransformer.transform(organization);
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
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmTimeTrackingMemberSwitchOrganizationOrganizationId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
// }): Promise<IHrmTimeTrackingOrganization> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_organizations.findFirstOrThrow({
//     ...HrmTimeTrackingOrganizationTransformer.select(),
//     where: { ... },
//   });
//   return await HrmTimeTrackingOrganizationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
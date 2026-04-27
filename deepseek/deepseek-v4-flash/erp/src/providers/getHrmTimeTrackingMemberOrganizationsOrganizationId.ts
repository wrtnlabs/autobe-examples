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

export async function getHrmTimeTrackingMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingOrganization> {
  // Validate that the requesting user belongs to this organization
  // by looking up their employee record. If no such record exists,
  // reject with 404 to maintain multi-tenant data isolation.
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      hrm_time_tracking_organization_id: props.organizationId,
    },
    select: { id: true },
  });
  if (employee === null) {
    throw new HttpException("Not Found", 404);
  }
  // Fetch the full organization record with nested owner relation
  const record =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      ...HrmTimeTrackingOrganizationTransformer.select(),
    });
  return await HrmTimeTrackingOrganizationTransformer.transform(record);
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
// export async function getHrmTimeTrackingMemberOrganizationsOrganizationId(props: {
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
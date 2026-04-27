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

export async function postHrmTimeTrackingMemberSwitchOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingOrganization> {
  // 1. Look up the target organization
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findUnique({
      where: { id: props.organizationId },
      select: { id: true, status: true },
    });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  if (organization.status === "deleted") {
    throw new HttpException("Organization has been deleted", 403);
  }
  // 2. Verify the member has an employee record in the target organization
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      hrm_time_tracking_organization_id: props.organizationId,
    },
    select: { id: true, status: true },
  });
  if (employee === null) {
    throw new HttpException("No membership in the target organization", 403);
  }
  if (employee.status === "deactivated") {
    throw new HttpException(
      "Deactivated employee access denied: your employee record has been deactivated in this organization",
      403,
    );
  }
  // 3. Fetch the full organization record with transformer select for the response
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
// export async function postHrmTimeTrackingMemberSwitchOrganizationsOrganizationId(props: {
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
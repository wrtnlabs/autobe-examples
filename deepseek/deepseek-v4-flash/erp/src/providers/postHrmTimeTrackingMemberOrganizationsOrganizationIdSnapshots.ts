import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingOrganizationSnapshotCollector } from "../collectors/HrmTimeTrackingOrganizationSnapshotCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingOrganizationSnapshotTransformer } from "../transformers/HrmTimeTrackingOrganizationSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberOrganizationsOrganizationIdSnapshots(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingOrganizationSnapshot.ICreate;
}): Promise<IHrmTimeTrackingOrganizationSnapshot> {
  // 1. Validate organization exists and is active
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findFirst({
      where: { id: props.organizationId },
      select: {
        id: true,
        status: true,
        hrm_time_tracking_member_id: true,
      },
    });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  if (organization.status !== "active") {
    throw new HttpException("Organization not found", 404);
  }
  // 2. Verify authorization: only the organization owner may create manual snapshots
  if (organization.hrm_time_tracking_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Create the snapshot using the collector and transformer
  const record =
    await MyGlobal.prisma.hrm_time_tracking_organization_snapshots.create({
      data: await HrmTimeTrackingOrganizationSnapshotCollector.collect({
        body: props.body,
        hrmTimeTrackingOrganizations: { id: props.organizationId },
        hrmTimeTrackingMembers: { id: props.member.id },
      }),
      ...HrmTimeTrackingOrganizationSnapshotTransformer.select(),
    });
  return await HrmTimeTrackingOrganizationSnapshotTransformer.transform(record);
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
// import { IHrmTimeTrackingOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationSnapshot";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmTimeTrackingMemberOrganizationsOrganizationIdSnapshots(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingOrganizationSnapshot.ICreate;
// }): Promise<IHrmTimeTrackingOrganizationSnapshot> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_organization_snapshots.create({
//     data: await HrmTimeTrackingOrganizationSnapshotCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmTimeTrackingOrganizationSnapshotTransformer.select(),
//   });
//   return await HrmTimeTrackingOrganizationSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
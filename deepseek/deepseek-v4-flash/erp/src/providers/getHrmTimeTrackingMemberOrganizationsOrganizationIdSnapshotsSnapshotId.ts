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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingOrganizationSnapshotTransformer } from "../transformers/HrmTimeTrackingOrganizationSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingMemberOrganizationsOrganizationIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingOrganizationSnapshot> {
  // Verify member has an employee record in this organization
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      hrm_time_tracking_organization_id: props.organizationId,
    },
    select: { id: true, status: true },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Query snapshot by composite key (snapshotId + organizationId)
  const record =
    await MyGlobal.prisma.hrm_time_tracking_organization_snapshots.findFirst({
      where: {
        id: props.snapshotId,
        hrm_time_tracking_organization_id: props.organizationId,
      },
      ...HrmTimeTrackingOrganizationSnapshotTransformer.select(),
    });
  if (record === null) {
    throw new HttpException("Snapshot not found", 404);
  }
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
// export async function getHrmTimeTrackingMemberOrganizationsOrganizationIdSnapshotsSnapshotId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IHrmTimeTrackingOrganizationSnapshot> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_organization_snapshots.findFirstOrThrow({
//     ...HrmTimeTrackingOrganizationSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await HrmTimeTrackingOrganizationSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
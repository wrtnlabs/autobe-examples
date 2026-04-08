import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganizationsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationsSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformOrganizationsSnapshotCollector } from "../collectors/HrmPlatformOrganizationsSnapshotCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformOrganizationsSnapshotTransformer } from "../transformers/HrmPlatformOrganizationsSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberOrganizationsOrganizationIdSnapshots(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmPlatformOrganizationsSnapshot.ICreate;
}): Promise<IHrmPlatformOrganizationsSnapshot> {
  // Step 1: Verify organization exists and is owned by the member
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: { id: true, owner_id: true },
    });
  // Step 2: Verify member is the organization owner
  if (organization.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Create snapshot using Collector
  const record =
    await MyGlobal.prisma.hrm_platform_organizations_snapshots.create({
      data: await HrmPlatformOrganizationsSnapshotCollector.collect({
        body: props.body,
        hrmPlatformOrganizations: { id: organization.id },
      }),
      ...HrmPlatformOrganizationsSnapshotTransformer.select(),
    });
  // Step 4: Transform and return
  return await HrmPlatformOrganizationsSnapshotTransformer.transform(record);
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
// import { IHrmPlatformOrganizationsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationsSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmPlatformMemberOrganizationsOrganizationIdSnapshots(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmPlatformOrganizationsSnapshot.ICreate;
// }): Promise<IHrmPlatformOrganizationsSnapshot> {
//   const record = await MyGlobal.prisma.hrm_platform_organizations_snapshots.create({
//     data: await HrmPlatformOrganizationsSnapshotCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmPlatformOrganizationsSnapshotTransformer.select(),
//   });
//   return await HrmPlatformOrganizationsSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
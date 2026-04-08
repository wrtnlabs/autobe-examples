import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganizationsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationsSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformOrganizationsSnapshotTransformer } from "../transformers/HrmPlatformOrganizationsSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberOrganizationsOrganizationIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformOrganizationsSnapshot> {
  const record =
    await MyGlobal.prisma.hrm_platform_organizations_snapshots.findFirstOrThrow(
      {
        ...HrmPlatformOrganizationsSnapshotTransformer.select(),
        where: {
          id: props.snapshotId,
          hrm_platform_organization_id: props.organizationId,
        },
      },
    );
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
// export async function getHrmPlatformMemberOrganizationsOrganizationIdSnapshotsSnapshotId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IHrmPlatformOrganizationsSnapshot> {
//   const record = await MyGlobal.prisma.hrm_platform_organizations_snapshots.findFirstOrThrow({
//     ...HrmPlatformOrganizationsSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await HrmPlatformOrganizationsSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
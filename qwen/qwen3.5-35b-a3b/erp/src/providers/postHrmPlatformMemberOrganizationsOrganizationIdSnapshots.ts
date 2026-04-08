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
  // Verify organization exists
  await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
    where: { id: props.organizationId },
  });
  // Check if member has Owner role for this organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_organization_id: props.organizationId,
      hrm_platform_member_id: props.member.id,
      is_pending: false,
    },
    include: {
      role: {
        select: {
          name: true,
        },
      },
    },
  });
  if (!employee || employee.role.name !== "Owner") {
    throw new HttpException("Forbidden", 403);
  }
  const record =
    await MyGlobal.prisma.hrm_platform_organizations_snapshots.create({
      data: await HrmPlatformOrganizationsSnapshotCollector.collect({
        body: props.body,
        hrmPlatformOrganizations: { id: props.organizationId } as IEntity,
      }),
      ...HrmPlatformOrganizationsSnapshotTransformer.select(),
    });
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
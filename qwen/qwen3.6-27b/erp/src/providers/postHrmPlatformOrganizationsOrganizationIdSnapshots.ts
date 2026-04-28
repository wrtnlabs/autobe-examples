import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformOrganizationSnapshotTransformer } from "../transformers/HrmPlatformOrganizationSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformOrganizationsOrganizationIdSnapshots(props: {
  organizationId: string & tags.Format<"uuid">;
  body: IHrmPlatformOrganizationSnapshot;
}): Promise<IHrmPlatformOrganizationSnapshot> {
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        logo_uri: true,
        currency: true,
        timezone: true,
        fiscal_start_month: true,
      },
    });
  const snapshot =
    await MyGlobal.prisma.hrm_platform_organization_snapshots.create({
      data: {
        id: v4(),
        organization: { connect: { id: organization.id } },
        actingMember: { connect: { id: props.body.actingMember.id } },
        name: organization.name,
        description: organization.description,
        logo_href: organization.logo_uri,
        currency: organization.currency,
        timezone: organization.timezone,
        fiscal_start_month: organization.fiscal_start_month,
        created_at: new Date(),
      },
      ...HrmPlatformOrganizationSnapshotTransformer.select(),
    });
  return await HrmPlatformOrganizationSnapshotTransformer.transform(snapshot);
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
// import { IHrmPlatformOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSnapshot";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmPlatformOrganizationsOrganizationIdSnapshots(props: {
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmPlatformOrganizationSnapshot;
// }): Promise<IHrmPlatformOrganizationSnapshot> {
//   const record = await MyGlobal.prisma.hrm_platform_organization_snapshots.findFirstOrThrow({
//     ...HrmPlatformOrganizationSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await HrmPlatformOrganizationSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
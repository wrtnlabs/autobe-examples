import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganizationSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformOrganizationSnapshotAtSummaryTransformer } from "../transformers/HrmPlatformOrganizationSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformOrganizationsOrganizationIdSnapshots(props: {
  organizationId: string & tags.Format<"uuid">;
  body: IHrmPlatformOrganizationSnapshot.IRequest;
}): Promise<IPageIHrmPlatformOrganizationSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_organization_snapshotsWhereInput = {
    hrm_platform_organization_id: props.organizationId,
    ...(props.body.created_from && {
      created_at: { gte: new Date(props.body.created_from) },
    }),
    ...(props.body.created_to && {
      created_at: { lte: new Date(props.body.created_to) },
    }),
    ...(props.body.currency && { currency: props.body.currency }),
    ...(props.body.timezone && { timezone: props.body.timezone }),
    ...(props.body.acting_member_id && {
      hrm_platform_member_id: props.body.acting_member_id,
    }),
    ...(props.body.name && {
      name: { contains: props.body.name, mode: "insensitive" as const },
    }),
  };
  const orderByInput: Prisma.hrm_platform_organization_snapshotsOrderByWithRelationInput =
    props.body.sort === "-created_at"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const };
  const records =
    await MyGlobal.prisma.hrm_platform_organization_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...HrmPlatformOrganizationSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.hrm_platform_organization_snapshots.count(
    {
      where: whereInput,
    },
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformOrganizationSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmPlatformOrganizationSnapshot.ISummary;
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
// import { IPageIHrmPlatformOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganizationSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformOrganizationsOrganizationIdSnapshots(props: {
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmPlatformOrganizationSnapshot.IRequest;
// }): Promise<IPageIHrmPlatformOrganizationSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_organization_snapshots.findMany({
//     ...HrmPlatformOrganizationSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformOrganizationSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------
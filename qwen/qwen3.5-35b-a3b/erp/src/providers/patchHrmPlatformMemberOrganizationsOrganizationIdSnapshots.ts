import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganizationsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationsSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformOrganizationsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganizationsSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformOrganizationsSnapshotAtSummaryTransformer } from "../transformers/HrmPlatformOrganizationsSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberOrganizationsOrganizationIdSnapshots(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmPlatformOrganizationsSnapshot.IRequest;
}): Promise<IPageIHrmPlatformOrganizationsSnapshot.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 10;
  const skip: number = (page - 1) * limit;
  const whereConditions: Array<Prisma.hrm_platform_organizations_snapshotsWhereInput> =
    [{ hrm_platform_organization_id: props.organizationId }];
  if (props.body.search !== undefined && props.body.search !== null) {
    whereConditions.push({
      name: { contains: props.body.search },
    });
  }
  if (
    props.body.created_at_min !== undefined &&
    props.body.created_at_min !== null
  ) {
    whereConditions.push({
      created_at: { gte: new Date(props.body.created_at_min) },
    });
  }
  if (
    props.body.created_at_max !== undefined &&
    props.body.created_at_max !== null
  ) {
    whereConditions.push({
      created_at: { lte: new Date(props.body.created_at_max) },
    });
  }
  if (props.body.status !== undefined && props.body.status !== null) {
    whereConditions.push({
      status: props.body.status,
    });
  }
  const whereInput: Prisma.hrm_platform_organizations_snapshotsWhereInput =
    whereConditions.length === 1
      ? whereConditions[0]
      : { AND: whereConditions };
  const data =
    await MyGlobal.prisma.hrm_platform_organizations_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...HrmPlatformOrganizationsSnapshotAtSummaryTransformer.select(),
    });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    HrmPlatformOrganizationsSnapshotAtSummaryTransformer.transform,
  );
  const total =
    await MyGlobal.prisma.hrm_platform_organizations_snapshots.count({
      where: whereInput,
    });
  const pages: number = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data: transformedData,
  };
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
// import { IPageIHrmPlatformOrganizationsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganizationsSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberOrganizationsOrganizationIdSnapshots(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmPlatformOrganizationsSnapshot.IRequest;
// }): Promise<IPageIHrmPlatformOrganizationsSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_organizations_snapshots.findMany({
//     ...HrmPlatformOrganizationsSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformOrganizationsSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------
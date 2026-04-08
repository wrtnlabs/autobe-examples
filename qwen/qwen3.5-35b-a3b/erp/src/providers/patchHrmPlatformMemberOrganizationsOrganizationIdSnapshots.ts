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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_organizations_snapshotsWhereInput = {
    hrm_platform_organization_id: props.organizationId,
  };
  if (props.body.search !== undefined) {
    whereInput.name = { contains: props.body.search };
  }
  let gte: Date | undefined;
  let lte: Date | undefined;
  if (props.body.created_at_min !== undefined) {
    gte = new Date(toISOStringSafe(props.body.created_at_min));
  }
  if (props.body.created_at_max !== undefined) {
    lte = new Date(toISOStringSafe(props.body.created_at_max));
  }
  if (gte !== undefined || lte !== undefined) {
    whereInput.created_at = {
      ...(gte !== undefined && { gte }),
      ...(lte !== undefined && { lte }),
    };
  }
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  const [records, total] = await Promise.all([
    MyGlobal.prisma.hrm_platform_organizations_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...HrmPlatformOrganizationsSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_platform_organizations_snapshots.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformOrganizationsSnapshotAtSummaryTransformer.transform,
    ),
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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganizationSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingOrganizationSnapshotAtSummaryTransformer } from "../transformers/HrmTimeTrackingOrganizationSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingMemberOrganizationsOrganizationIdSnapshots(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingOrganizationSnapshot.IRequest;
}): Promise<IPageIHrmTimeTrackingOrganizationSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions with strict organization scoping
  const where: Prisma.hrm_time_tracking_organization_snapshotsWhereInput = {
    hrm_time_tracking_organization_id: props.organizationId,
  };
  if (props.body.search !== undefined) {
    where.event_details = { contains: props.body.search };
  }
  if (props.body.event_type !== undefined) {
    where.event_type = props.body.event_type;
  }
  // Date range filter on created_at — pass ISO string directly (Prisma accepts it)
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    const createdAtFilter: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    } = {};
    if (props.body.created_at_from !== undefined) {
      createdAtFilter.gte = props.body.created_at_from;
    }
    if (props.body.created_at_to !== undefined) {
      createdAtFilter.lte = props.body.created_at_to;
    }
    where.created_at = createdAtFilter;
  }
  if (props.body.hrm_time_tracking_member_id !== undefined) {
    where.hrm_time_tracking_member_id = props.body.hrm_time_tracking_member_id;
  }
  // Sorting — default created_at DESC
  const sortField = props.body.sort_field ?? "created_at";
  const sortDirection: "asc" | "desc" =
    props.body.sort_direction === "asc" ? "asc" : "desc";
  const orderBy: Prisma.hrm_time_tracking_organization_snapshotsOrderByWithRelationInput =
    {};
  if (sortField === "event_type") {
    orderBy.event_type = sortDirection;
  } else if (sortField === "name") {
    orderBy.name = sortDirection;
  } else {
    orderBy.created_at = sortDirection;
  }
  const data =
    await MyGlobal.prisma.hrm_time_tracking_organization_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...HrmTimeTrackingOrganizationSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.hrm_time_tracking_organization_snapshots.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmTimeTrackingOrganizationSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// import { IHrmTimeTrackingOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationSnapshot";
// import { IPageIHrmTimeTrackingOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganizationSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmTimeTrackingMemberOrganizationsOrganizationIdSnapshots(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingOrganizationSnapshot.IRequest;
// }): Promise<IPageIHrmTimeTrackingOrganizationSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.hrm_time_tracking_organization_snapshots.findMany({
//     ...HrmTimeTrackingOrganizationSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTimeTrackingOrganizationSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------
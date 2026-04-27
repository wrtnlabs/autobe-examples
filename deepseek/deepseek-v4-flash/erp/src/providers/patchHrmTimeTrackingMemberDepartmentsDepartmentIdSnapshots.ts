import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartmentSnapshot";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingDepartmentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingDepartmentSnapshotAtSummaryTransformer } from "../transformers/HrmTimeTrackingDepartmentSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingMemberDepartmentsDepartmentIdSnapshots(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingDepartmentSnapshot.IRequest;
}): Promise<IPageIHrmTimeTrackingDepartmentSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.hrm_time_tracking_department_snapshotsWhereInput = {
    hrm_time_tracking_department_id: props.departmentId,
  };
  if (props.body.change_type !== undefined) {
    where.change_type = props.body.change_type;
  }
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    where.created_at = {};
    if (props.body.created_at_from !== undefined) {
      where.created_at.gte = props.body.created_at_from;
    }
    if (props.body.created_at_to !== undefined) {
      where.created_at.lte = props.body.created_at_to;
    }
  }
  if (props.body.actor_member_id !== undefined) {
    where.actor_member_id = props.body.actor_member_id ?? null;
  }
  const orderBy: Prisma.hrm_time_tracking_department_snapshotsOrderByWithRelationInput =
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  const records =
    await MyGlobal.prisma.hrm_time_tracking_department_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...HrmTimeTrackingDepartmentSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.hrm_time_tracking_department_snapshots.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackingDepartmentSnapshotAtSummaryTransformer.transform,
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
// import { IHrmTimeTrackingDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartmentSnapshot";
// import { IPageIHrmTimeTrackingDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingDepartmentSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmTimeTrackingMemberDepartmentsDepartmentIdSnapshots(props: {
//   member: MemberPayload;
//   departmentId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingDepartmentSnapshot.IRequest;
// }): Promise<IPageIHrmTimeTrackingDepartmentSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.hrm_time_tracking_department_snapshots.findMany({
//     ...HrmTimeTrackingDepartmentSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTimeTrackingDepartmentSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------
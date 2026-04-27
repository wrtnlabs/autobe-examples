import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingActivityLogType } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLogType";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingActivityLogType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingActivityLogType";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingActivityLogTypeAtSummaryTransformer } from "../transformers/HrmTimeTrackingActivityLogTypeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingMemberActivityLogTypes(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingActivityLogType.IRequest;
}): Promise<IPageIHrmTimeTrackingActivityLogType.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.hrm_time_tracking_activity_log_typesWhereInput = {
    deleted_at: null,
    ...(props.body.category !== undefined && {
      category: props.body.category,
    }),
    ...(props.body.search !== undefined && {
      OR: [
        { code: { contains: props.body.search } },
        { name: { contains: props.body.search } },
      ],
    }),
  };
  const orderBy = [
    { category: "asc" as const },
    { code: "asc" as const },
  ] satisfies Prisma.hrm_time_tracking_activity_log_typesOrderByWithRelationInput[];
  const records =
    await MyGlobal.prisma.hrm_time_tracking_activity_log_types.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...HrmTimeTrackingActivityLogTypeAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.hrm_time_tracking_activity_log_types.count({
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
      HrmTimeTrackingActivityLogTypeAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmTimeTrackingActivityLogType.ISummary;
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
// import { IHrmTimeTrackingActivityLogType } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLogType";
// import { IPageIHrmTimeTrackingActivityLogType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingActivityLogType";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmTimeTrackingMemberActivityLogTypes(props: {
//   member: MemberPayload;
//   body: IHrmTimeTrackingActivityLogType.IRequest;
// }): Promise<IPageIHrmTimeTrackingActivityLogType.ISummary> {
//   const records = await MyGlobal.prisma.hrm_time_tracking_activity_log_types.findMany({
//     ...HrmTimeTrackingActivityLogTypeAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTimeTrackingActivityLogTypeAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------
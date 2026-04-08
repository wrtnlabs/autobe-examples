import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformActivityLogAtSummaryTransformer } from "../transformers/HrmPlatformActivityLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberActivityLogs(props: {
  member: MemberPayload;
  body: IHrmPlatformActivityLog.IRequest;
}): Promise<IPageIHrmPlatformActivityLog.ISummary> {
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
      hrm_platform_member_id: props.member.id,
    },
    select: {
      id: true,
      organization_id: true,
    },
  });
  if (!session) {
    throw new HttpException("Forbidden", 403);
  }
  const organizationId = session.organization_id!;
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_activity_logsWhereInput = {
    organization_id: organizationId,
    deleted_at: null,
    ...(props.body.entity_type && { entity_type: props.body.entity_type }),
    ...(props.body.action_type && { action_type: props.body.action_type }),
    ...(props.body.action_name && { action_name: props.body.action_name }),
    ...(props.body.member_id !== undefined && {
      member_id: props.body.member_id,
    }),
    ...(props.body.from && {
      created_at: { gte: toISOStringSafe(props.body.from) },
    }),
    ...(props.body.to && {
      created_at: { lte: toISOStringSafe(props.body.to) },
    }),
    ...(props.body.extra_data !== undefined &&
      props.body.extra_data !== null && {
        extra_data: { contains: props.body.extra_data },
      }),
  } satisfies Prisma.hrm_platform_activity_logsWhereInput;
  const sort = props.body.sort ?? "-created_at";
  const hasAscendingPrefix = sort.startsWith("-");
  const sortField = hasAscendingPrefix ? sort.slice(1) : sort;
  const sortOrder = hasAscendingPrefix ? ("asc" as const) : ("desc" as const);
  const allowedSortFields = ["created_at", "updated_at"] as const;
  const isValidSortField = allowedSortFields.includes(
    sortField as (typeof allowedSortFields)[number],
  );
  const orderByInput: Prisma.hrm_platform_activity_logsOrderByWithRelationInput =
    isValidSortField && sortField === "updated_at"
      ? { updated_at: sortOrder }
      : { created_at: sortOrder };
  const data = await MyGlobal.prisma.hrm_platform_activity_logs.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...HrmPlatformActivityLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_activity_logs.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformActivityLogAtSummaryTransformer.transform,
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
// import { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
// import { IPageIHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberActivityLogs(props: {
//   member: MemberPayload;
//   body: IHrmPlatformActivityLog.IRequest;
// }): Promise<IPageIHrmPlatformActivityLog.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_activity_logs.findMany({
//     ...HrmPlatformActivityLogAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformActivityLogAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------
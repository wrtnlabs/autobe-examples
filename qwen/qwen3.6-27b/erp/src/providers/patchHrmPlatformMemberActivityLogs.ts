import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import { IHrmPlatformActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogDetail";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
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
  const orgRecord = await MyGlobal.prisma.hrm_platform_activity_logs.findFirst({
    where: { hrm_platform_member_id: props.member.id },
    select: { hrm_platform_organization_id: true },
  });
  if (orgRecord === null) {
    throw new HttpException("Organization not found for this member", 400);
  }
  const organizationId = orgRecord.hrm_platform_organization_id;
  const limit = props.body.pageSize ?? props.body.limit ?? 100;
  if (limit > 100) {
    throw new HttpException("Page size exceeds maximum allowed value", 400);
  }
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  const base = {
    hrm_platform_organization_id: organizationId,
    ...(props.body.actionType?.length && {
      action_type: { in: props.body.actionType },
    }),
    ...(props.body.entityType?.length && {
      entity_type: { in: props.body.entityType },
    }),
    ...(props.body.memberId && { hrm_platform_member_id: props.body.memberId }),
    ...(props.body.dateFrom && { created_at: { gte: props.body.dateFrom } }),
    ...(props.body.dateTo && { created_at: { lte: props.body.dateTo } }),
    ...(props.body.searchTerm && {
      entity_name: {
        contains: props.body.searchTerm,
        mode: "insensitive" as const,
      },
    }),
  };
  const where = props.body.cursor
    ? {
        AND: [
          base,
          {
            OR: [
              { created_at: { lt: props.body.cursor.createdAt } },
              {
                AND: [
                  { created_at: props.body.cursor.createdAt },
                  { id: { lt: props.body.cursor.id } },
                ],
              },
            ],
          },
        ],
      }
    : base;
  const records = await MyGlobal.prisma.hrm_platform_activity_logs.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const, id: "desc" as const },
    ...HrmPlatformActivityLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_activity_logs.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformActivityLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
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
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogDetail";
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
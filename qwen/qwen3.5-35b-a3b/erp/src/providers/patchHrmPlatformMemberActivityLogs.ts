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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const validatedLimit = limit > 100 ? 100 : limit;
  const skip = (page - 1) * validatedLimit;
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findFirstOrThrow({
      where: {
        id: props.member.session_id,
      },
      select: {
        organization_id: true,
        expired_at: true,
      },
    });
  if (
    toISOStringSafe(new Date(session.expired_at)) <= toISOStringSafe(new Date())
  ) {
    throw new HttpException("Session expired", 401);
  }
  const member = await MyGlobal.prisma.hrm_platform_members.findFirstOrThrow({
    where: {
      id: props.member.id,
    },
    select: {
      id: true,
    },
  });
  if (!member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const where: Prisma.hrm_platform_activity_logsWhereInput = {
    deleted_at: null,
    organization_id: session.organization_id!,
  } satisfies Prisma.hrm_platform_activity_logsWhereInput;
  if (props.body.entity_type !== undefined) {
    where.entity_type = props.body.entity_type;
  }
  if (props.body.action_type !== undefined) {
    where.action_type = props.body.action_type;
  }
  if (props.body.action_name !== undefined) {
    where.action_name = props.body.action_name;
  }
  if (props.body.member_id !== undefined) {
    where.member_id = props.body.member_id ?? null;
  }
  if (props.body.from !== undefined) {
    const fromFilter: Prisma.DateTimeFilter = {
      gte: new Date(props.body.from),
    };
    where.created_at = {
      ...(where.created_at as Prisma.DateTimeFilter | undefined),
      ...fromFilter,
    } as Prisma.DateTimeFilter;
  }
  if (props.body.to !== undefined) {
    const toFilter: Prisma.DateTimeFilter = {
      lte: new Date(props.body.to),
    };
    where.created_at = {
      ...(where.created_at as Prisma.DateTimeFilter | undefined),
      ...toFilter,
    } as Prisma.DateTimeFilter;
  }
  if (props.body.extra_data !== undefined) {
    where.extra_data = props.body.extra_data ?? null;
  }
  const sort = props.body.sort ?? "-created_at";
  const sortField = sort.startsWith("-") ? sort.substring(1) : sort;
  const sortOrder: "asc" | "desc" = sort.startsWith("-") ? "desc" : "asc";
  const validSortFields: Array<
    keyof Prisma.hrm_platform_activity_logsOrderByWithRelationInput
  > = ["created_at", "updated_at"];
  if (
    !validSortFields.includes(
      sortField as keyof Prisma.hrm_platform_activity_logsOrderByWithRelationInput,
    )
  ) {
    throw new HttpException("Invalid sort field", 400);
  }
  const orderBy: Prisma.hrm_platform_activity_logsOrderByWithRelationInput[] = [
    { [sortField]: sortOrder },
  ];
  const records = await MyGlobal.prisma.hrm_platform_activity_logs.findMany({
    where,
    skip,
    take: validatedLimit,
    orderBy,
    ...HrmPlatformActivityLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_activity_logs.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: validatedLimit,
      records: total,
      pages: Math.ceil(total / validatedLimit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
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
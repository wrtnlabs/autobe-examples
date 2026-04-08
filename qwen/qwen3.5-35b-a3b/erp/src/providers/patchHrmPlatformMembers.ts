import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformMemberAtSummaryTransformer } from "../transformers/HrmPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMembers(props: {
  body: IHrmPlatformMember.IRequest;
}): Promise<IPageIHrmPlatformMember.ISummary> {
  const page = props.body.page ?? 1;
  const defaultLimit = 20;
  const maxLimit = 100;
  const limit = Math.min(
    Math.max(props.body.limit ?? defaultLimit, defaultLimit),
    maxLimit,
  );
  const skip = (page - 1) * limit;
  const whereClause: Prisma.hrm_platform_membersWhereInput = {
    deleted_at: null,
    ...(props.body.email !== undefined &&
      props.body.email !== null && {
        email: {
          contains: props.body.email,
          mode: "insensitive",
        },
      }),
    ...(props.body.display_name !== undefined &&
      props.body.display_name !== null && {
        display_name: {
          contains: props.body.display_name,
          mode: "insensitive",
        },
      }),
    ...(props.body.is_active !== undefined &&
      props.body.is_active !== null && {
        is_active: props.body.is_active,
      }),
    ...(props.body.created_at !== undefined &&
      props.body.created_at !== null && {
        created_at: {
          ...(props.body.created_at.gte && {
            gte: props.body.created_at.gte,
          }),
          ...(props.body.created_at.lt && {
            lt: props.body.created_at.lt,
          }),
        },
      }),
    ...(props.body.updated_at !== undefined &&
      props.body.updated_at !== null && {
        updated_at: {
          ...(props.body.updated_at.gte && {
            gte: props.body.updated_at.gte,
          }),
          ...(props.body.updated_at.lt && {
            lt: props.body.updated_at.lt,
          }),
        },
      }),
    ...(props.body.last_login_at !== undefined &&
      props.body.last_login_at !== null && {
        last_login_at: {
          ...(props.body.last_login_at.gte && {
            gte: props.body.last_login_at.gte,
          }),
          ...(props.body.last_login_at.lt && {
            lt: props.body.last_login_at.lt,
          }),
        },
      }),
  };
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByClause = {
    [sortBy]: sortOrder as "asc" | "desc",
  };
  const records = await MyGlobal.prisma.hrm_platform_members.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: orderByClause,
    ...HrmPlatformMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_members.count({
    where: whereClause,
  });
  const data = await ArrayUtil.asyncMap(
    records,
    HrmPlatformMemberAtSummaryTransformer.transform,
  );
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIHrmPlatformMember.ISummary;
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
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IPageIHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMember";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMembers(props: {
//   body: IHrmPlatformMember.IRequest;
// }): Promise<IPageIHrmPlatformMember.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_members.findMany({
//     ...HrmPlatformMemberAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformMemberAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------
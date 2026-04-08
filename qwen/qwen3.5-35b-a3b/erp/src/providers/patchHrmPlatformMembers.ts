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
  if (props.body.cursor !== undefined) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(props.body.cursor)) {
      throw new HttpException("Invalid cursor format", 400);
    }
  }
  const validSortFields: readonly string[] = [
    "email",
    "display_name",
    "is_active",
    "created_at",
    "updated_at",
    "last_login_at",
  ];
  if (
    props.body.sortBy !== undefined &&
    !validSortFields.includes(props.body.sortBy)
  ) {
    throw new HttpException("Invalid sortBy field", 400);
  }
  if (
    props.body.sortOrder !== undefined &&
    !["asc", "desc"].includes(props.body.sortOrder)
  ) {
    throw new HttpException("Invalid sortOrder value", 400);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = Math.min(Math.max(props.body.limit ?? 20, 20), 100);
  const cursor: string | undefined = props.body.cursor;
  const skip: number = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_membersWhereInput = {
    deleted_at: null,
  };
  if (props.body.email !== undefined) {
    whereInput.email = { contains: props.body.email };
  }
  if (props.body.display_name !== undefined) {
    whereInput.display_name = { contains: props.body.display_name };
  }
  if (props.body.is_active !== undefined) {
    whereInput.is_active = props.body.is_active;
  }
  if (props.body.created_at !== undefined) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.created_at.gte !== undefined) {
      createdAtFilter.gte = props.body.created_at.gte;
    }
    if (props.body.created_at.lt !== undefined) {
      createdAtFilter.lt = props.body.created_at.lt;
    }
    whereInput.created_at = createdAtFilter;
  }
  if (props.body.updated_at !== undefined) {
    const updatedAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.updated_at.gte !== undefined) {
      updatedAtFilter.gte = props.body.updated_at.gte;
    }
    if (props.body.updated_at.lt !== undefined) {
      updatedAtFilter.lt = props.body.updated_at.lt;
    }
    whereInput.updated_at = updatedAtFilter;
  }
  if (props.body.last_login_at !== undefined) {
    const lastLoginAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.last_login_at.gte !== undefined) {
      lastLoginAtFilter.gte = props.body.last_login_at.gte;
    }
    if (props.body.last_login_at.lt !== undefined) {
      lastLoginAtFilter.lt = props.body.last_login_at.lt;
    }
    whereInput.last_login_at = lastLoginAtFilter;
  }
  const sortBy: string = props.body.sortBy ?? "created_at";
  const sortOrder: "asc" | "desc" = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.hrm_platform_membersOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };
  const cursorInput: Prisma.hrm_platform_membersWhereUniqueInput | undefined =
    cursor !== undefined ? { id: cursor } : undefined;
  const data = await MyGlobal.prisma.hrm_platform_members.findMany({
    where: whereInput,
    skip: cursor !== undefined ? 0 : skip,
    take: limit,
    cursor: cursorInput,
    orderBy: orderByInput,
    ...HrmPlatformMemberAtSummaryTransformer.select(),
  });
  const total: number = await MyGlobal.prisma.hrm_platform_members.count({
    where: whereInput,
  });
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  const transformedData: IHrmPlatformMember.ISummary[] =
    await ArrayUtil.asyncMap(
      data,
      HrmPlatformMemberAtSummaryTransformer.transform,
    );
  return {
    pagination,
    data: transformedData,
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
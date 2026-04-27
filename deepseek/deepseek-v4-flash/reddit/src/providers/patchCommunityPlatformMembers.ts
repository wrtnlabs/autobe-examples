import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformMemberAtSummaryTransformer } from "../transformers/CommunityPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMembers(props: {
  body: ICommunityPlatformMember.IRequest;
}): Promise<IPageICommunityPlatformMember.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const where: Prisma.community_platform_membersWhereInput = {};
  if (props.body.include_deleted !== true) {
    where.deleted_at = null;
  }
  if (props.body.search !== undefined) {
    where.OR = [
      { email: { contains: props.body.search, mode: "insensitive" } },
      { username: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  if (props.body.email !== undefined) {
    where.email = { contains: props.body.email, mode: "insensitive" };
  }
  if (props.body.username !== undefined) {
    where.username = { contains: props.body.username, mode: "insensitive" };
  }
  if (props.body.created_at_from !== undefined) {
    where.created_at = {
      ...(props.body.created_at_to !== undefined
        ? { lte: props.body.created_at_to }
        : {}),
      gte: props.body.created_at_from,
    };
  } else if (props.body.created_at_to !== undefined) {
    where.created_at = { lte: props.body.created_at_to };
  }
  const sortField: string = props.body.sort ?? "created_at";
  const validSortFields: string[] = ["username", "email", "created_at"];
  const orderField: string = validSortFields.includes(sortField)
    ? sortField
    : "created_at";
  const direction: string = props.body.direction ?? "desc";
  const orderDirection: "asc" | "desc" = direction === "asc" ? "asc" : "desc";
  const orderBy: Prisma.community_platform_membersOrderByWithRelationInput =
    orderField === "username"
      ? { username: orderDirection }
      : orderField === "email"
        ? { email: orderDirection }
        : { created_at: orderDirection };
  const total: number = await MyGlobal.prisma.community_platform_members.count({
    where,
  });
  const records = await MyGlobal.prisma.community_platform_members.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...CommunityPlatformMemberAtSummaryTransformer.select(),
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
      CommunityPlatformMemberAtSummaryTransformer.transform,
    ),
  } satisfies IPageICommunityPlatformMember.ISummary;
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
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityPlatformMembers(props: {
//   body: ICommunityPlatformMember.IRequest;
// }): Promise<IPageICommunityPlatformMember.ISummary> {
//   const records = await MyGlobal.prisma.community_platform_members.findMany({
//     ...CommunityPlatformMemberAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityPlatformMemberAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------
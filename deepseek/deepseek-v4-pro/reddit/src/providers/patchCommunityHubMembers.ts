import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityHubMemberAtSummaryTransformer } from "../transformers/CommunityHubMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityHubMembers(props: {
  body: ICommunityHubMember.IRequest;
}): Promise<IPageICommunityHubMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search
      ? {
          OR: [
            {
              username: {
                contains: props.body.search,
                mode: "insensitive" as const,
              },
            },
            {
              display_name: {
                contains: props.body.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
    ...(props.body.karma_min !== undefined || props.body.karma_max !== undefined
      ? {
          karma: {
            ...(props.body.karma_min !== undefined && {
              gte: props.body.karma_min,
            }),
            ...(props.body.karma_max !== undefined && {
              lte: props.body.karma_max,
            }),
          },
        }
      : {}),
    ...(props.body.created_after || props.body.created_before
      ? {
          created_at: {
            ...(props.body.created_after
              ? { gte: new Date(props.body.created_after) }
              : {}),
            ...(props.body.created_before
              ? { lte: new Date(props.body.created_before) }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.community_hub_membersWhereInput;
  const sort = props.body.sort ?? "newest";
  const orderByInput = (
    sort === "newest"
      ? { created_at: "desc" as const }
      : sort === "oldest"
        ? { created_at: "asc" as const }
        : sort === "username_asc"
          ? { username: "asc" as const }
          : sort === "username_desc"
            ? { username: "desc" as const }
            : sort === "karma_highest"
              ? { karma: "desc" as const }
              : { karma: "asc" as const }
  ) satisfies Prisma.community_hub_membersOrderByWithRelationInput;
  const data = await MyGlobal.prisma.community_hub_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityHubMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_hub_members.count({
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
      CommunityHubMemberAtSummaryTransformer.transform,
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
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// import { IPageICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubMember";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityHubMembers(props: {
//   body: ICommunityHubMember.IRequest;
// }): Promise<IPageICommunityHubMember.ISummary> {
//   const records = await MyGlobal.prisma.community_hub_members.findMany({
//     ...CommunityHubMemberAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityHubMemberAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformModeratorAtSummaryTransformer } from "../transformers/CommunityPlatformModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModerators(props: {
  body: ICommunityPlatformModerator.IRequest;
}): Promise<IPageICommunityPlatformModerator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    member: { deleted_at: null },
    community: { deleted_at: null },
    ...(props.body.community_id !== undefined && {
      community_id: props.body.community_id,
    }),
    ...(props.body.member_id !== undefined && {
      member_id: props.body.member_id,
    }),
    ...(props.body.role !== undefined && { role: props.body.role }),
    ...(props.body.search !== undefined && {
      OR: [
        {
          member: {
            username: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
        },
        {
          community: {
            name: { contains: props.body.search, mode: "insensitive" as const },
          },
        },
      ],
    }),
  } satisfies Prisma.community_platform_moderatorsWhereInput;
  const orderByInput = (() => {
    if (props.body.sort === undefined || props.body.sort === "-created_at") {
      return { created_at: "desc" as const };
    }
    if (props.body.sort === "created_at") {
      return { created_at: "asc" as const };
    }
    if (props.body.sort === "-role") {
      return { role: "desc" as const };
    }
    if (props.body.sort === "role") {
      return { role: "asc" as const };
    }
    return { created_at: "desc" as const };
  })() satisfies Prisma.community_platform_moderatorsOrderByWithRelationInput;
  const records = await MyGlobal.prisma.community_platform_moderators.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...CommunityPlatformModeratorAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_platform_moderators.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      CommunityPlatformModeratorAtSummaryTransformer.transform,
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
// import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
// import { IPageICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerator";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityPlatformModerators(props: {
//   body: ICommunityPlatformModerator.IRequest;
// }): Promise<IPageICommunityPlatformModerator.ISummary> {
//   const records = await MyGlobal.prisma.community_platform_moderators.findMany({
//     ...CommunityPlatformModeratorAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityPlatformModeratorAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------
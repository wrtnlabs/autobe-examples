import { ICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityModerator";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityHubCommunityModeratorAtSummaryTransformer } from "../transformers/CommunityHubCommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityHubCommunitiesCommunityNameModerators(props: {
  communityName: string;
  body: ICommunityHubCommunityModerator.IRequest;
}): Promise<IPageICommunityHubCommunityModerator.ISummary> {
  const community =
    await MyGlobal.prisma.community_hub_communities.findFirstOrThrow({
      where: {
        name: { equals: props.communityName, mode: "insensitive" },
        deleted_at: null,
      },
      select: { id: true },
    });
  const limit = Math.min(Math.max(props.body.limit ?? 20, 1), 100);
  const sort = props.body.sort ?? "created_at_asc";
  const isDesc = sort === "created_at_desc";
  const baseWhere: Prisma.community_hub_community_moderatorsWhereInput = {
    community_hub_community_id: community.id,
    ...(props.body.role ? { role: props.body.role } : {}),
  };
  let cursorWhere: Prisma.community_hub_community_moderatorsWhereInput = {};
  if (props.body.cursor) {
    let decoded: {
      created_at: string;
      id: string;
    };
    try {
      decoded = JSON.parse(
        Buffer.from(props.body.cursor, "base64").toString("utf-8"),
      );
    } catch {
      throw new HttpException("Invalid cursor", 400);
    }
    if (isDesc) {
      cursorWhere = {
        OR: [
          { created_at: { lt: decoded.created_at } },
          {
            created_at: { equals: decoded.created_at },
            id: { lt: decoded.id },
          },
        ],
      };
    } else {
      cursorWhere = {
        OR: [
          { created_at: { gt: decoded.created_at } },
          {
            created_at: { equals: decoded.created_at },
            id: { gt: decoded.id },
          },
        ],
      };
    }
  }
  const queryWhere: Prisma.community_hub_community_moderatorsWhereInput = {
    ...baseWhere,
    ...cursorWhere,
  };
  const orderBy: Prisma.community_hub_community_moderatorsOrderByWithRelationInput[] =
    isDesc
      ? [{ created_at: "desc" }, { id: "desc" }]
      : [{ created_at: "asc" }, { id: "asc" }];
  const pageNum = props.body.cursor ? 1 : Math.max(props.body.page ?? 1, 1);
  const skip = props.body.cursor ? undefined : (pageNum - 1) * limit;
  const records =
    await MyGlobal.prisma.community_hub_community_moderators.findMany({
      where: queryWhere,
      orderBy,
      ...(skip !== undefined ? { skip } : {}),
      take: limit,
      ...CommunityHubCommunityModeratorAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.community_hub_community_moderators.count({
    where: baseWhere,
  });
  return {
    pagination: {
      current: pageNum,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      CommunityHubCommunityModeratorAtSummaryTransformer.transform,
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
// import { ICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityModerator";
// import { IPageICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubCommunityModerator";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityHubCommunitiesCommunityNameModerators(props: {
//   communityName: string;
//   body: ICommunityHubCommunityModerator.IRequest;
// }): Promise<IPageICommunityHubCommunityModerator.ISummary> {
//   const records = await MyGlobal.prisma.community_hub_community_moderators.findMany({
//     ...CommunityHubCommunityModeratorAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityHubCommunityModeratorAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------
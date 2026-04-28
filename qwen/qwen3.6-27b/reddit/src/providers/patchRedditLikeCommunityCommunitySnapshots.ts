import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunityCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunitySnapshot";
import { IRedditLikeCommunityCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunityCommunitySnapshots(props: {
  body: IRedditLikeCommunityCommunitySnapshot.IRequest;
}): Promise<IPageIRedditLikeCommunityCommunitySnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    ...(props.body.community_id && {
      reddit_like_community_communities_id: props.body.community_id,
    }),
    ...(props.body.owner_member_id && {
      reddit_like_community_members_id: props.body.owner_member_id,
    }),
    ...(props.body.created_at_gte && {
      created_at: { gte: new Date(props.body.created_at_gte) },
    }),
    ...(props.body.created_at_lte && {
      created_at: { lte: new Date(props.body.created_at_lte) },
    }),
  } satisfies Prisma.reddit_like_community_community_snapshotsWhereInput;
  const data =
    await MyGlobal.prisma.reddit_like_community_community_snapshots.findMany({
      where: where,
      skip: skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        reddit_like_community_communities_id: true,
        reddit_like_community_members_id: true,
        name: true,
        created_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.reddit_like_community_community_snapshots.count({
      where: where,
    });
  return {
    data: data.map((row) => ({
      community_id: row.reddit_like_community_communities_id,
      owner_id: row.reddit_like_community_members_id,
      name: row.name,
      from_date: toISOStringSafe(row.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditLikeCommunityCommunitySnapshot.ISummary;
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
// import { IRedditLikeCommunityCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySnapshot";
// import { IPageIRedditLikeCommunityCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunitySnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditLikeCommunityCommunitySnapshots(props: {
//   body: IRedditLikeCommunityCommunitySnapshot.IRequest;
// }): Promise<IPageIRedditLikeCommunityCommunitySnapshot.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------
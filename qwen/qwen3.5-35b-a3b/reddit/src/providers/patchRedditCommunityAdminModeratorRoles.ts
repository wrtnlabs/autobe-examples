import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModeratorRole";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditCommunityModeratorRoleAtSummaryTransformer } from "../transformers/RedditCommunityModeratorRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityAdminModeratorRoles(props: {
  admin: AdminPayload;
  body: IRedditCommunityModeratorRole.IRequest;
}): Promise<IPageIRedditCommunityModeratorRole.ISummary> {
  const page = props.body.page ?? 1;
  const limitRaw = props.body.limit ?? 20;
  const limit = Math.max(Math.min(limitRaw, 100), 1);
  const cursor = props.body.cursor;
  const take = limit;
  const whereInput: Prisma.reddit_community_moderator_rolesWhereInput = {
    deleted_at: null,
    ...(props.body.reddit_community_community_id !== undefined && {
      reddit_community_community_id: props.body.reddit_community_community_id,
    }),
    ...(props.body.reddit_community_member_id !== undefined && {
      reddit_community_member_id: props.body.reddit_community_member_id,
    }),
    ...(props.body.role !== undefined && {
      role: props.body.role,
    }),
    ...(props.body.created_at_min && {
      created_at: { gte: props.body.created_at_min },
    }),
    ...(props.body.created_at_max && {
      created_at: { lte: props.body.created_at_max },
    }),
    ...(props.body.updated_at_min && {
      updated_at: { gte: props.body.updated_at_min },
    }),
    ...(props.body.updated_at_max && {
      updated_at: { lte: props.body.updated_at_max },
    }),
    ...(cursor !== undefined && {
      created_at: { lt: cursor },
    }),
  } satisfies Prisma.reddit_community_moderator_rolesWhereInput;
  const orderByInput = {
    created_at: "desc" as const,
  } satisfies Prisma.reddit_community_moderator_rolesOrderByWithRelationInput;
  const records =
    await MyGlobal.prisma.reddit_community_moderator_roles.findMany({
      where: whereInput,
      orderBy: orderByInput,
      take,
      skip: cursor ? 0 : (page - 1) * take,
      ...RedditCommunityModeratorRoleAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.reddit_community_moderator_roles.count({
    where: whereInput,
  });
  const pages = total === 0 ? 0 : Math.ceil(total / take);
  return {
    pagination: {
      current: page,
      limit: take,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditCommunityModeratorRoleAtSummaryTransformer.transform,
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
// import { IRedditCommunityModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorRole";
// import { IPageIRedditCommunityModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModeratorRole";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityAdminModeratorRoles(props: {
//   admin: AdminPayload;
//   body: IRedditCommunityModeratorRole.IRequest;
// }): Promise<IPageIRedditCommunityModeratorRole.ISummary> {
//   const records = await MyGlobal.prisma.reddit_community_moderator_roles.findMany({
//     ...RedditCommunityModeratorRoleAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCommunityModeratorRoleAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------
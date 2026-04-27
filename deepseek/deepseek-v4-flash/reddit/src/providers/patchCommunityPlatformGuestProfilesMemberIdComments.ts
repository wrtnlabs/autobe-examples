import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { CommunityPlatformCommentAtSummaryTransformer } from "../transformers/CommunityPlatformCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformGuestProfilesMemberIdComments(props: {
  guest: GuestPayload;
  memberId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  // Check if member exists and is not soft-deleted
  const member = await MyGlobal.prisma.community_platform_members.findUnique({
    where: { id: props.memberId },
    select: { id: true, deleted_at: true },
  });
  if (member === null || member.deleted_at !== null) {
    const emptyPage = props.body.page ?? 1;
    const emptyLimit = props.body.limit ?? 100;
    return {
      pagination: {
        current: emptyPage,
        limit: emptyLimit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "best";
  const where = {
    community_platform_member_id: props.memberId,
    deleted_at: null,
  } satisfies Prisma.community_platform_commentsWhereInput;
  if (sort === "controversial") {
    const allComments =
      await MyGlobal.prisma.community_platform_comments.findMany({
        where,
        select: { id: true, vote_score: true },
        orderBy: { created_at: "desc" },
      });
    allComments.sort((a, b) => Math.abs(b.vote_score) - Math.abs(a.vote_score));
    const total = allComments.length;
    const pagedIds = allComments.slice(skip, skip + limit).map((c) => c.id);
    if (pagedIds.length === 0) {
      return {
        pagination: {
          current: page,
          limit: limit,
          records: total,
          pages: Math.ceil(total / limit),
        } satisfies IPage.IPagination,
        data: [],
      };
    }
    const records = await MyGlobal.prisma.community_platform_comments.findMany({
      where: {
        id: { in: pagedIds },
      } satisfies Prisma.community_platform_commentsWhereInput,
      ...CommunityPlatformCommentAtSummaryTransformer.select(),
    });
    const idOrder = new Map(pagedIds.map((id, i) => [id, i]));
    records.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));
    return {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
      data: await CommunityPlatformCommentAtSummaryTransformer.transformAll(
        records,
      ),
    };
  }
  const orderBy =
    sort === "new"
      ? ([
          { created_at: "desc" },
        ] satisfies Prisma.community_platform_commentsOrderByWithRelationInput[])
      : ([
          { vote_score: "desc" },
          { created_at: "desc" },
        ] satisfies Prisma.community_platform_commentsOrderByWithRelationInput[]);
  const records = await MyGlobal.prisma.community_platform_comments.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...CommunityPlatformCommentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_platform_comments.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await CommunityPlatformCommentAtSummaryTransformer.transformAll(
      records,
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
// import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
// import { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityPlatformGuestProfilesMemberIdComments(props: {
//   guest: GuestPayload;
//   memberId: string & tags.Format<"uuid">;
//   body: ICommunityPlatformComment.IRequest;
// }): Promise<IPageICommunityPlatformComment.ISummary> {
//   const records = await MyGlobal.prisma.community_platform_comments.findMany({
//     ...CommunityPlatformCommentAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await CommunityPlatformCommentAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------
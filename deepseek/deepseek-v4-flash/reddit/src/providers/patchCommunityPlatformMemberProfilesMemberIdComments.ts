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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentAtSummaryTransformer } from "../transformers/CommunityPlatformCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberProfilesMemberIdComments(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "best";
  const whereInput = {
    community_platform_member_id: props.memberId,
    deleted_at: null,
  } satisfies Prisma.community_platform_commentsWhereInput;
  const total = await MyGlobal.prisma.community_platform_comments.count({
    where: whereInput,
  });
  if (total === 0) {
    return {
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  if (sort === "controversial") {
    const allRecords =
      await MyGlobal.prisma.community_platform_comments.findMany({
        where: whereInput,
        orderBy: { created_at: "desc" },
        ...CommunityPlatformCommentAtSummaryTransformer.select(),
      });
    const sorted = [...allRecords].sort((a, b) => {
      const absA = Math.abs(a.vote_score);
      const absB = Math.abs(b.vote_score);
      if (absB !== absA) return absB - absA;
      return b.created_at.getTime() - a.created_at.getTime();
    });
    const paged = sorted.slice(skip, skip + limit);
    return {
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
      data: await CommunityPlatformCommentAtSummaryTransformer.transformAll(
        paged,
      ),
    };
  }
  const orderBy:
    | Prisma.community_platform_commentsOrderByWithRelationInput
    | Prisma.community_platform_commentsOrderByWithRelationInput[] =
    sort === "best"
      ? [{ vote_score: "desc" }, { created_at: "desc" }]
      : { created_at: "desc" };
  const records = await MyGlobal.prisma.community_platform_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    ...CommunityPlatformCommentAtSummaryTransformer.select(),
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
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
// export async function patchCommunityPlatformMemberProfilesMemberIdComments(props: {
//   member: MemberPayload;
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
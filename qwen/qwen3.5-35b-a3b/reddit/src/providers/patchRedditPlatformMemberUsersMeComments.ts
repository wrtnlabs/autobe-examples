import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommentAtSummaryTransformer } from "../transformers/RedditPlatformCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberUsersMeComments(props: {
  member: MemberPayload;
  body: IRedditPlatformComment.IRequest;
}): Promise<IPageIRedditPlatformComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_platform_commentsWhereInput = {
    reddit_platform_member_id: props.member.id,
    deleted_at: null,
  };
  if (props.body.created_at_start !== undefined) {
    whereInput.created_at = { gte: new Date(props.body.created_at_start) };
  }
  if (props.body.created_at_end !== undefined) {
    if (whereInput.created_at && typeof whereInput.created_at === "object") {
      whereInput.created_at = {
        ...whereInput.created_at,
        lte: new Date(props.body.created_at_end),
      };
    } else {
      whereInput.created_at = { lte: new Date(props.body.created_at_end) };
    }
  }
  const sortBy = props.body.sortBy ?? "new";
  const order = props.body.order;
  const orderDir: "asc" | "desc" = order ?? "desc";
  let orderByInput: Prisma.reddit_platform_commentsOrderByWithRelationInput;
  if (sortBy === "new") {
    orderByInput = { created_at: orderDir };
  } else if (sortBy === "top") {
    orderByInput = { score: orderDir };
  } else if (sortBy === "best") {
    orderByInput = { score: "desc" as const, created_at: "desc" as const };
  } else if (sortBy === "controversial") {
    orderByInput = { score: "asc" as const, created_at: "desc" as const };
  } else {
    orderByInput = { created_at: orderDir };
  }
  const data = await MyGlobal.prisma.reddit_platform_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: [orderByInput],
    ...RedditPlatformCommentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_comments.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await RedditPlatformCommentAtSummaryTransformer.transformAll(data),
  } satisfies IPageIRedditPlatformComment.ISummary;
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
// import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
// import { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMemberUsersMeComments(props: {
//   member: MemberPayload;
//   body: IRedditPlatformComment.IRequest;
// }): Promise<IPageIRedditPlatformComment.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_comments.findMany({
//     ...RedditPlatformCommentAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await RedditPlatformCommentAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------
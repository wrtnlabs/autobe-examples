import { ICommunityPlatformVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteSummary";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteSummary";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { CommunityPlatformVoteSummaryAtSummaryTransformer } from "../transformers/CommunityPlatformVoteSummaryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformGuestVoteSummaries(props: {
  guest: GuestPayload;
  body: ICommunityPlatformVoteSummary.IRequest;
}): Promise<IPageICommunityPlatformVoteSummary.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.community_platform_vote_summariesWhereInput = {};
  if (props.body.target_type !== undefined) {
    whereInput.target_type = props.body.target_type;
  }
  if (
    props.body.min_net_score !== undefined ||
    props.body.max_net_score !== undefined
  ) {
    whereInput.net_score = {};
    if (props.body.min_net_score !== undefined) {
      whereInput.net_score.gte = props.body.min_net_score;
    }
    if (props.body.max_net_score !== undefined) {
      whereInput.net_score.lte = props.body.max_net_score;
    }
  }
  if (
    props.body.min_upvote_count !== undefined ||
    props.body.max_upvote_count !== undefined
  ) {
    whereInput.upvote_count = {};
    if (props.body.min_upvote_count !== undefined) {
      whereInput.upvote_count.gte = props.body.min_upvote_count;
    }
    if (props.body.max_upvote_count !== undefined) {
      whereInput.upvote_count.lte = props.body.max_upvote_count;
    }
  }
  if (
    props.body.min_downvote_count !== undefined ||
    props.body.max_downvote_count !== undefined
  ) {
    whereInput.downvote_count = {};
    if (props.body.min_downvote_count !== undefined) {
      whereInput.downvote_count.gte = props.body.min_downvote_count;
    }
    if (props.body.max_downvote_count !== undefined) {
      whereInput.downvote_count.lte = props.body.max_downvote_count;
    }
  }
  if (
    props.body.created_at_since !== undefined ||
    props.body.created_at_until !== undefined
  ) {
    whereInput.created_at = {};
    if (props.body.created_at_since !== undefined) {
      whereInput.created_at.gte = props.body.created_at_since;
    }
    if (props.body.created_at_until !== undefined) {
      whereInput.created_at.lte = props.body.created_at_until;
    }
  }
  if (
    props.body.updated_at_since !== undefined ||
    props.body.updated_at_until !== undefined
  ) {
    whereInput.updated_at = {};
    if (props.body.updated_at_since !== undefined) {
      whereInput.updated_at.gte = props.body.updated_at_since;
    }
    if (props.body.updated_at_until !== undefined) {
      whereInput.updated_at.lte = props.body.updated_at_until;
    }
  }
  const orderByInput = (
    props.body.sort === "upvote_count"
      ? { upvote_count: "desc" }
      : props.body.sort === "downvote_count"
        ? { downvote_count: "desc" }
        : props.body.sort === "created_at"
          ? { created_at: "desc" }
          : props.body.sort === "updated_at"
            ? { updated_at: "desc" }
            : { net_score: "desc" }
  ) satisfies Prisma.community_platform_vote_summariesOrderByWithRelationInput;
  const records =
    await MyGlobal.prisma.community_platform_vote_summaries.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityPlatformVoteSummaryAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.community_platform_vote_summaries.count({
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
      CommunityPlatformVoteSummaryAtSummaryTransformer.transform,
    ),
  } satisfies IPageICommunityPlatformVoteSummary.ISummary;
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
// import { ICommunityPlatformVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteSummary";
// import { IPageICommunityPlatformVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteSummary";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityPlatformGuestVoteSummaries(props: {
//   guest: GuestPayload;
//   body: ICommunityPlatformVoteSummary.IRequest;
// }): Promise<IPageICommunityPlatformVoteSummary.ISummary> {
//   const records = await MyGlobal.prisma.community_platform_vote_summaries.findMany({
//     ...CommunityPlatformVoteSummaryAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityPlatformVoteSummaryAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------
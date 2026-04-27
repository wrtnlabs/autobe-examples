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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformVoteSummaryAtSummaryTransformer } from "../transformers/CommunityPlatformVoteSummaryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityPlatformMemberVoteSummaries(props: {
  member: MemberPayload;
  body: ICommunityPlatformVoteSummary.IRequest;
}): Promise<IPageICommunityPlatformVoteSummary.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.community_platform_vote_summariesWhereInput = {
    ...(props.body.target_type !== undefined && {
      target_type: props.body.target_type,
    }),
    ...((props.body.min_net_score !== undefined ||
      props.body.max_net_score !== undefined) && {
      net_score: {
        ...(props.body.min_net_score !== undefined && {
          gte: props.body.min_net_score,
        }),
        ...(props.body.max_net_score !== undefined && {
          lte: props.body.max_net_score,
        }),
      },
    }),
    ...((props.body.min_upvote_count !== undefined ||
      props.body.max_upvote_count !== undefined) && {
      upvote_count: {
        ...(props.body.min_upvote_count !== undefined && {
          gte: props.body.min_upvote_count,
        }),
        ...(props.body.max_upvote_count !== undefined && {
          lte: props.body.max_upvote_count,
        }),
      },
    }),
    ...((props.body.min_downvote_count !== undefined ||
      props.body.max_downvote_count !== undefined) && {
      downvote_count: {
        ...(props.body.min_downvote_count !== undefined && {
          gte: props.body.min_downvote_count,
        }),
        ...(props.body.max_downvote_count !== undefined && {
          lte: props.body.max_downvote_count,
        }),
      },
    }),
    ...((props.body.created_at_since !== undefined ||
      props.body.created_at_until !== undefined) && {
      created_at: {
        ...(props.body.created_at_since !== undefined && {
          gte: props.body.created_at_since,
        }),
        ...(props.body.created_at_until !== undefined && {
          lte: props.body.created_at_until,
        }),
      },
    }),
    ...((props.body.updated_at_since !== undefined ||
      props.body.updated_at_until !== undefined) && {
      updated_at: {
        ...(props.body.updated_at_since !== undefined && {
          gte: props.body.updated_at_since,
        }),
        ...(props.body.updated_at_until !== undefined && {
          lte: props.body.updated_at_until,
        }),
      },
    }),
  } satisfies Prisma.community_platform_vote_summariesWhereInput;
  const sortField = props.body.sort ?? "created_at";
  const orderByInput = {
    [sortField]: "desc",
  } satisfies Prisma.community_platform_vote_summariesOrderByWithRelationInput;
  const data = await MyGlobal.prisma.community_platform_vote_summaries.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityPlatformVoteSummaryAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.community_platform_vote_summaries.count({
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
      CommunityPlatformVoteSummaryAtSummaryTransformer.transform,
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
// import { ICommunityPlatformVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteSummary";
// import { IPageICommunityPlatformVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteSummary";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityPlatformMemberVoteSummaries(props: {
//   member: MemberPayload;
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
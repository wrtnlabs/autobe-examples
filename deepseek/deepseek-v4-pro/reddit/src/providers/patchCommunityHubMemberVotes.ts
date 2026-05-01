import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityHubVoteAtSummaryTransformer } from "../transformers/CommunityHubVoteAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityHubMemberVotes(props: {
  member: MemberPayload;
  body: ICommunityHubVote.IRequest;
}): Promise<IPageICommunityHubVote.ISummary> {
  if (
    props.body.member_id !== undefined &&
    props.body.member_id !== props.member.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const memberId: string & tags.Format<"uuid"> =
    props.body.member_id ?? props.member.id;
  const limit: number = props.body.limit ?? 20;
  const whereInput = {
    member_id: memberId,
    ...(props.body.target_type !== undefined && {
      target_type: props.body.target_type,
    }),
    ...(props.body.target_id !== undefined && {
      target_id: props.body.target_id,
    }),
    ...(props.body.value !== undefined && {
      value: props.body.value,
    }),
    ...((props.body.created_from !== undefined ||
      props.body.created_to !== undefined) && {
      created_at: {
        ...(props.body.created_from !== undefined && {
          gte: props.body.created_from,
        }),
        ...(props.body.created_to !== undefined && {
          lte: props.body.created_to,
        }),
      },
    }),
    ...((props.body.updated_from !== undefined ||
      props.body.updated_to !== undefined) && {
      updated_at: {
        ...(props.body.updated_from !== undefined && {
          gte: props.body.updated_from,
        }),
        ...(props.body.updated_to !== undefined && {
          lte: props.body.updated_to,
        }),
      },
    }),
  } satisfies Prisma.community_hub_votesWhereInput;
  const sort: string = props.body.sort ?? "-created_at";
  let orderBy: Prisma.community_hub_votesOrderByWithRelationInput;
  switch (sort) {
    case "created_at":
      orderBy = { created_at: "asc" };
      break;
    case "-created_at":
      orderBy = { created_at: "desc" };
      break;
    case "updated_at":
      orderBy = { updated_at: "asc" };
      break;
    case "-updated_at":
      orderBy = { updated_at: "desc" };
      break;
    default:
      orderBy = { created_at: "desc" };
      break;
  }
  let data: CommunityHubVoteAtSummaryTransformer.Payload[];
  if (props.body.cursor !== undefined) {
    const cursorRaw: string = Buffer.from(
      props.body.cursor,
      "base64",
    ).toString();
    const cursorParsed: {
      id: string;
    } = JSON.parse(cursorRaw);
    data = await MyGlobal.prisma.community_hub_votes.findMany({
      where: whereInput,
      orderBy: [
        orderBy,
        {
          id: "asc",
        } satisfies Prisma.community_hub_votesOrderByWithRelationInput,
      ],
      cursor: { id: cursorParsed.id },
      skip: 1,
      take: limit,
      ...CommunityHubVoteAtSummaryTransformer.select(),
    });
  } else {
    const page: number = props.body.page ?? 1;
    const skip: number = (page - 1) * limit;
    data = await MyGlobal.prisma.community_hub_votes.findMany({
      where: whereInput,
      orderBy,
      skip,
      take: limit,
      ...CommunityHubVoteAtSummaryTransformer.select(),
    });
  }
  const total: number = await MyGlobal.prisma.community_hub_votes.count({
    where: whereInput,
  });
  const currentPage: number =
    props.body.cursor !== undefined ? 0 : (props.body.page ?? 1);
  return {
    pagination: {
      current: currentPage,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      CommunityHubVoteAtSummaryTransformer.transform,
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
// import { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
// import { IPageICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubVote";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityHubMemberVotes(props: {
//   member: MemberPayload;
//   body: ICommunityHubVote.IRequest;
// }): Promise<IPageICommunityHubVote.ISummary> {
//   const records = await MyGlobal.prisma.community_hub_votes.findMany({
//     ...CommunityHubVoteAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityHubVoteAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------
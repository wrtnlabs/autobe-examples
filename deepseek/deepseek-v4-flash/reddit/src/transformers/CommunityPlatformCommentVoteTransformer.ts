import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommentAtSummaryTransformer } from "./CommunityPlatformCommentAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformCommentVoteTransformer {
  export type Payload = Prisma.community_platform_comment_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        value: true,
        created_at: true,
        updated_at: true,
        voter: CommunityPlatformMemberAtSummaryTransformer.select(),
        comment: CommunityPlatformCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_comment_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommentVote> {
    return {
      id: input.id,
      voter: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.voter,
      ),
      comment: await CommunityPlatformCommentAtSummaryTransformer.transform(
        input.comment,
      ),
      value: input.value,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies ICommunityPlatformCommentVote;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformCommentVoteTransformer {
//       export type Payload = Prisma.community_platform_comment_votesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             value: true,
//             created_at: true,
//             updated_at: true,
//             voter: CommunityPlatformMemberAtSummaryTransformer.select(),
//             comment: CommunityPlatformCommentAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.community_platform_comment_votesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformCommentVote> {
//         return {
//   id: {string},
//   voter: await CommunityPlatformMemberAtSummaryTransformer.transform(input.voter),
//   comment: await CommunityPlatformCommentAtSummaryTransformer.transform(input.comment),
//   value: {integer},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
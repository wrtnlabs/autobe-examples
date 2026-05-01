import { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityHubMemberAtSummaryTransformer } from "./CommunityHubMemberAtSummaryTransformer";
import { CommunityHubPostAtSummaryTransformer } from "./CommunityHubPostAtSummaryTransformer";

export namespace CommunityHubCommentAtSummaryTransformer {
  export type Payload = Prisma.community_hub_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        depth: true,
        vote_score: true,
        created_at: true,
        author: CommunityHubMemberAtSummaryTransformer.select(),
        post: CommunityHubPostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_hub_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityHubComment.ISummary> {
    return {
      id: input.id,
      depth: input.depth,
      vote_score: input.vote_score,
      author: await CommunityHubMemberAtSummaryTransformer.transform(
        input.author,
      ),
      post: await CommunityHubPostAtSummaryTransformer.transform(input.post),
      created_at: input.created_at.toISOString(),
    } satisfies ICommunityHubComment.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityHubCommentAtSummaryTransformer {
//       export type Payload = Prisma.community_hub_commentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             content: true,
//             depth: true,
//             vote_score: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             post: CommunityHubPostAtSummaryTransformer.select(),
//             author: CommunityHubMemberAtSummaryTransformer.select(),
//             community_hub_parent_comment_id: true,
//           },
//         } satisfies Prisma.community_hub_commentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityHubComment.ISummary> {
//         return {
//   id: {string},
//   depth: {integer},
//   vote_score: {integer},
//   author: await CommunityHubMemberAtSummaryTransformer.transform(input.author),
//   post: await CommunityHubPostAtSummaryTransformer.transform(input.post),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------
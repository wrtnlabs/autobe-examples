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
import { CommunityHubCommentAtSummaryTransformer } from "./CommunityHubCommentAtSummaryTransformer";
import { CommunityHubMemberAtSummaryTransformer } from "./CommunityHubMemberAtSummaryTransformer";
import { CommunityHubPostAtSummaryTransformer } from "./CommunityHubPostAtSummaryTransformer";

export namespace CommunityHubCommentTransformer {
  export type Payload = Prisma.community_hub_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        depth: true,
        vote_score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: CommunityHubPostAtSummaryTransformer.select(),
        author: CommunityHubMemberAtSummaryTransformer.select(),
        parentComment: CommunityHubCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_hub_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityHubComment> {
    return {
      id: input.id,
      content: input.content,
      depth: input.depth,
      vote_score: input.vote_score,
      author: await CommunityHubMemberAtSummaryTransformer.transform(
        input.author,
      ),
      post: await CommunityHubPostAtSummaryTransformer.transform(input.post),
      parent: input.parentComment
        ? await CommunityHubCommentAtSummaryTransformer.transform(
            input.parentComment,
          )
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies ICommunityHubComment;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityHubCommentTransformer {
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
//             ...
//           },
//         } satisfies Prisma.community_hub_commentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityHubComment> {
//         return {
//   id: {string},
//   content: {string},
//   depth: {integer},
//   vote_score: {integer},
//   author: await CommunityHubMemberAtSummaryTransformer.transform(input.author),
//   post: await CommunityHubPostAtSummaryTransformer.transform(input.post),
//   parent: {ICommunityHubComment.ISummary | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
import { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityHubMemberAtSummaryTransformer } from "./CommunityHubMemberAtSummaryTransformer";

export namespace CommunityHubCommentAtListTransformer {
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
        author: CommunityHubMemberAtSummaryTransformer.select(),
        post: {
          select: { id: true },
        } satisfies Prisma.community_hub_postsFindManyArgs,
        parentComment: {
          select: { id: true },
        } satisfies Prisma.community_hub_commentsFindManyArgs,
        childComments: undefined,
      },
    } satisfies Prisma.community_hub_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<ICommunityHubComment.IList[]>,
      [string]
    > = createChildrenCache(),
  ): Promise<ICommunityHubComment.IList> {
    return {
      id: input.id,
      content: input.content,
      depth: input.depth,
      vote_score: input.vote_score,
      author: await CommunityHubMemberAtSummaryTransformer.transform(
        input.author,
      ),
      childComments: await cache.get(input.id),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<ICommunityHubComment.IList[]> {
    const cache = createChildrenCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createChildrenCache() {
    const cache = new VariadicSingleton(
      async (parentId: string): Promise<ICommunityHubComment.IList[]> => {
        const records = await MyGlobal.prisma.community_hub_comments.findMany({
          ...select(),
          where: { community_hub_parent_comment_id: parentId },
        });
        return await ArrayUtil.asyncMap(records, (r) => transform(r, cache));
      },
    );
    return cache;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityHubCommentAtListTransformer {
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
//             community_hub_post_id: true,
//             community_hub_member_id: true,
//             community_hub_parent_comment_id: true,
//             childComments: undefined, // DO NOT select recursive relation
//             ...
//           },
//         } satisfies Prisma.community_hub_commentsFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<ICommunityHubComment.IList[]>, [string]> = createChildrenCache(),
//       ): Promise<ICommunityHubComment.IList> {
//         return {
//   id: {string},
//   content: {string},
//   depth: {integer},
//   vote_score: {integer},
//   author: {ICommunityHubMember.ISummary},
//   childComments: await cache.get(input.id),
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<ICommunityHubComment.IList[]> {
//         const cache = createChildrenCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createChildrenCache() {
//         const cache = new VariadicSingleton(
//           async (parentId: string): Promise<ICommunityHubComment.IList[]> => {
//             const records =
//               await MyGlobal.prisma.community_hub_comments.findMany({
//                 ...select(),
//                 where: { community_hub_parent_comment_id: parentId },
//               });
//             return await ArrayUtil.asyncMap(records, (r) => transform(r, cache));
//           },
//         );
//         return cache;
//       }
//     }
//--------------------------------------------------------------
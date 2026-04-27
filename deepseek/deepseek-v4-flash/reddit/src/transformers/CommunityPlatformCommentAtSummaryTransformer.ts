import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";

export namespace CommunityPlatformCommentAtSummaryTransformer {
  export type Payload = Prisma.community_platform_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        vote_score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community_platform_member_id: true,
        community_platform_post_id: true,
        community_platform_comment_id: true,
        author: CommunityPlatformMemberAtSummaryTransformer.select(),
        post: CommunityPlatformPostAtSummaryTransformer.select(),
        parentComment: undefined,
        replies: {
          select: {
            id: true,
            deleted_at: true,
          },
        } satisfies Prisma.community_platform_commentsFindManyArgs,
      },
    } satisfies Prisma.community_platform_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<ICommunityPlatformComment.ISummary>,
      [string]
    > = createParentCache(),
  ): Promise<ICommunityPlatformComment.ISummary> {
    return {
      id: input.id,
      content: input.content,
      vote_score: input.vote_score,
      reply_count: input.replies.filter((r) => r.deleted_at === null).length,
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      author: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      post: await CommunityPlatformPostAtSummaryTransformer.transform(
        input.post,
      ),
      parentComment: input.community_platform_comment_id
        ? await cache.get(input.community_platform_comment_id)
        : null,
    } satisfies ICommunityPlatformComment.ISummary;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<ICommunityPlatformComment.ISummary[]> {
    const cache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createParentCache(): VariadicSingleton<
    Promise<ICommunityPlatformComment.ISummary>,
    [string]
  > {
    const cache = new VariadicSingleton(
      async (id: string): Promise<ICommunityPlatformComment.ISummary> => {
        const record =
          await MyGlobal.prisma.community_platform_comments.findFirstOrThrow({
            ...select(),
            where: { id },
          });
        return transform(record, cache);
      },
    );
    return cache;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformCommentAtSummaryTransformer {
//       export type Payload = Prisma.community_platform_commentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             content: true,
//             vote_score: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             community_platform_member_id: true,
//             community_platform_post_id: true,
//             community_platform_comment_id: true,
//             parentComment: undefined, // DO NOT select recursive relation
//             ...
//           },
//         } satisfies Prisma.community_platform_commentsFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<ICommunityPlatformComment.ISummary>, [string]> = createParentCache(),
//       ): Promise<ICommunityPlatformComment.ISummary> {
//         return {
//   id: {string},
//   content: {string},
//   vote_score: {integer},
//   reply_count: {integer},
//   created_at: {string},
//   deleted_at: {string | null},
//   author: {ICommunityPlatformMember.ISummary},
//   post: {ICommunityPlatformPost.ISummary},
//   parentComment: input.community_platform_comment_id ? await cache.get(input.community_platform_comment_id) : null,
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<ICommunityPlatformComment.ISummary[]> {
//         const cache = createParentCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createParentCache() {
//         const cache = new VariadicSingleton(
//           async (id: string): Promise<ICommunityPlatformComment.ISummary> => {
//             const record =
//               await MyGlobal.prisma.community_platform_comments.findFirstOrThrow({
//                 ...select(),
//                 where: { id },
//               });
//             return transform(record, cache);
//           },
//         );
//         return cache;
//       }
//     }
//--------------------------------------------------------------
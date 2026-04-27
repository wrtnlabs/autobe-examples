import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformCommentTransformer {
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
        author: CommunityPlatformMemberAtSummaryTransformer.select(),
        post: undefined,
        parentComment: undefined,
        reports: undefined,
        replies: undefined,
        votes: undefined,
        reportTargets: undefined,
      },
    } satisfies Prisma.community_platform_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<ICommunityPlatformComment[]>,
      [string]
    > = createChildrenCache(),
  ): Promise<ICommunityPlatformComment> {
    return {
      id: input.id,
      content: input.content,
      voteScore: input.vote_score,
      author: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      replies: await cache.get(input.id),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies ICommunityPlatformComment;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<ICommunityPlatformComment[]> {
    const cache = createChildrenCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createChildrenCache() {
    const cache = new VariadicSingleton(
      async (parentId: string): Promise<ICommunityPlatformComment[]> => {
        const records =
          await MyGlobal.prisma.community_platform_comments.findMany({
            ...select(),
            where: { community_platform_comment_id: parentId },
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
//     export namespace CommunityPlatformCommentTransformer {
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
//             replies: undefined, // DO NOT select recursive relation
//             ...
//           },
//         } satisfies Prisma.community_platform_commentsFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<ICommunityPlatformComment[]>, [string]> = createChildrenCache(),
//       ): Promise<ICommunityPlatformComment> {
//         return {
//   id: {string},
//   content: {string},
//   voteScore: {integer},
//   author: {ICommunityPlatformMember.ISummary},
//   replies: await cache.get(input.id),
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<ICommunityPlatformComment[]> {
//         const cache = createChildrenCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createChildrenCache() {
//         const cache = new VariadicSingleton(
//           async (parentId: string): Promise<ICommunityPlatformComment[]> => {
//             const records =
//               await MyGlobal.prisma.community_platform_comments.findMany({
//                 ...select(),
//                 where: { community_platform_comment_id: parentId },
//               });
//             return await ArrayUtil.asyncMap(records, (r) => transform(r, cache));
//           },
//         );
//         return cache;
//       }
//     }
//--------------------------------------------------------------
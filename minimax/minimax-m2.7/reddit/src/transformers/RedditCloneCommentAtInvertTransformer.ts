import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneCommentAtInvertTransformer {
  export type Payload = Prisma.reddit_clone_commentsGetPayload<
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
        member: {
          select: {
            id: true,
            username: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            type: true,
            vote_score: true,
            comment_count: true,
            created_at: true,
            community: {
              select: {
                id: true,
                name: true,
                description: true,
                subscriber_count: true,
                member: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
            },
            author: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        parent: undefined,
        replies: undefined,
      },
    } satisfies Prisma.reddit_clone_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IRedditCloneComment.IInvert[]>,
      [string]
    > = createChildrenCache(),
  ): Promise<IRedditCloneComment.IInvert> {
    return {
      id: input.id,
      content: input.deleted_at ? null : input.content,
      createdAt: toISOStringSafe(input.created_at),
      voteScore: input.vote_score,
      author: {
        id: input.member.id,
        username: input.member.username,
      } satisfies IRedditCloneMember.ISummary,
      post: {
        id: input.post.id,
        title: input.post.title,
        type: input.post.type as "text" | "link" | "image",
        voteScore: input.post.vote_score,
        commentCount: input.post.comment_count,
        createdAt: toISOStringSafe(input.post.created_at),
        contentPreview: input.post.title,
        community: {
          id: input.post.community.id,
          name: input.post.community.name,
          description: input.post.community.description,
          subscriberCount: input.post.community.subscriber_count,
          owner: {
            id: input.post.community.member.id,
            username: input.post.community.member.username,
          } satisfies IRedditCloneMember.ISummary,
        } satisfies IRedditCloneCommunity.ISummary,
        author: {
          id: input.post.author.id,
          username: input.post.author.username,
        } satisfies IRedditCloneMember.ISummary,
      } satisfies IRedditClonePost.ISummary,
      replies: await cache.get(input.id),
    } satisfies IRedditCloneComment.IInvert;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IRedditCloneComment.IInvert[]> {
    const cache = createChildrenCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createChildrenCache() {
    const cache = new VariadicSingleton(
      async (parentId: string): Promise<IRedditCloneComment.IInvert[]> => {
        const records = await MyGlobal.prisma.reddit_clone_comments.findMany({
          ...select(),
          where: { parent_comment_id: parentId },
          orderBy: { vote_score: "desc" },
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
//     export namespace RedditCloneCommentAtInvertTransformer {
//       export type Payload = Prisma.reddit_clone_commentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             content: true,
//             createdAt: true,
//             voteScore: true,
//             replies: undefined, // DO NOT select recursive relation
//             ...
//           },
//         } satisfies Prisma.reddit_clone_commentsFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IRedditCloneComment.IInvert[]>, [string]> = createChildrenCache(),
//       ): Promise<IRedditCloneComment.IInvert> {
//         return {
//   id: {string},
//   content: {string | null},
//   createdAt: {string},
//   voteScore: {integer},
//   author: {IRedditCloneMember.ISummary},
//   post: {IRedditClonePost.ISummary},
//   replies: await cache.get(input.id),
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IRedditCloneComment.IInvert[]> {
//         const cache = createChildrenCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createChildrenCache() {
//         const cache = new VariadicSingleton(
//           async (parentId: string): Promise<IRedditCloneComment.IInvert[]> => {
//             const records =
//               await MyGlobal.prisma.reddit_clone_comments.findMany({
//                 ...select(),
//                 where: { parent_id: parentId },
//               });
//             return await ArrayUtil.asyncMap(records, (r) => transform(r, cache));
//           },
//         );
//         return cache;
//       }
//     }
//--------------------------------------------------------------
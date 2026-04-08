import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditClonePostAtSummaryTransformer } from "./RedditClonePostAtSummaryTransformer";

export namespace RedditCloneCommentTransformer {
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
        post: RedditClonePostAtSummaryTransformer.select(),
        member: {
          select: {
            id: true,
            username: true,
          },
        },
        parent: {
          select: {
            id: true,
            content: true,
            vote_score: true,
            created_at: true,
            member: {
              select: {
                id: true,
                username: true,
              },
            },
            parent: true,
            replies: true,
          },
        },
        replies: {
          select: {
            id: true,
            content: true,
            vote_score: true,
            created_at: true,
            member: {
              select: {
                id: true,
                username: true,
              },
            },
            parent: true,
            replies: true,
          },
        } satisfies Prisma.reddit_clone_commentsFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneComment> {
    const transformSummary = async (
      comment: {
        id: string;
        content: string;
        vote_score: number;
        created_at: Date;
        member: {
          id: string;
          username: string;
        };
        parent: unknown;
        replies: unknown[];
      },
      cache: VariadicSingleton<
        Promise<IRedditCloneComment.ISummary[]>,
        [string]
      >,
    ): Promise<IRedditCloneComment.ISummary> => {
      return {
        id: comment.id as string & tags.Format<"uuid">,
        content: comment.content,
        author: {
          id: comment.member.id as string & tags.Format<"uuid">,
          username: comment.member.username,
        },
        voteScore: comment.vote_score as number & tags.Type<"int32">,
        createdAt: comment.created_at.toISOString() as string &
          tags.Format<"date-time">,
        replies: await cache.get(comment.id),
      };
    };
    const cache = new VariadicSingleton(
      async (parentId: string): Promise<IRedditCloneComment.ISummary[]> => {
        const records = await MyGlobal.prisma.reddit_clone_comments.findMany({
          where: { parent_comment_id: parentId },
        });
        return await ArrayUtil.asyncMap(records, (r) =>
          transformSummary(r, cache),
        );
      },
    );
    return {
      id: input.id,
      content: input.content,
      voteScore: input.vote_score,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt:
        input.deleted_at != null ? toISOStringSafe(input.deleted_at) : null,
      post: await RedditClonePostAtSummaryTransformer.transform(input.post),
      member: {
        id: input.member.id,
        username: input.member.username,
      },
      parent: input.parent
        ? await transformSummary(
            input.parent as {
              id: string;
              content: string;
              vote_score: number;
              created_at: Date;
              member: {
                id: string;
                username: string;
              };
              parent: unknown;
              replies: unknown[];
            },
            cache,
          )
        : null,
      replies: await cache.get(input.id),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneCommentTransformer {
//       export type Payload = Prisma.reddit_clone_commentsGetPayload<ReturnType<typeof select>>;
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
//             post: RedditClonePostAtSummaryTransformer.select(),
//             member: RedditCloneMemberAtSummaryTransformer.select(),
//             parent_comment_id: true,
//             ...
//           },
//         } satisfies Prisma.reddit_clone_commentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneComment> {
//         return {
//   id: {string},
//   content: {string},
//   voteScore: {integer},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//   post: await RedditClonePostAtSummaryTransformer.transform(input.post),
//   member: await RedditCloneMemberAtSummaryTransformer.transform(input.member),
//   parent: {IRedditCloneComment.ISummary | null},
//   replies: {Array<IRedditCloneComment.ISummary>},
//         };
//       }
//     }
//--------------------------------------------------------------
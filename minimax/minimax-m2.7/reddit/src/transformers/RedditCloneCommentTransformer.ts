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
import { RedditCloneCommentAtSummaryTransformer } from "./RedditCloneCommentAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";
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
        post: {
          select: {
            id: true,
            title: true,
            type: true,
            vote_score: true,
            comment_count: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            author: {
              select: {
                id: true,
                username: true,
              },
            },
            community: {
              select: {
                id: true,
                name: true,
                description: true,
                subscriber_count: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                member: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
                icon: true,
              },
            },
            postTextContent: {
              select: {
                body: true,
              },
            },
            link: {
              select: {
                url: true,
              },
            },
            image: true,
            comments: {
              select: {
                id: true,
              },
            },
            postVotes: {
              select: {
                id: true,
              },
            },
          },
        },
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
            updated_at: true,
            deleted_at: true,
            post: true,
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
            updated_at: true,
            deleted_at: true,
            post: true,
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
      },
    } satisfies Prisma.reddit_clone_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneComment> {
    return {
      id: input.id,
      content: input.content,
      voteScore: input.vote_score,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      post: await RedditClonePostAtSummaryTransformer.transform(
        input.post as any,
      ),
      member: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      parent: input.parent
        ? await RedditCloneCommentAtSummaryTransformer.transform(input.parent)
        : null,
      replies: await ArrayUtil.asyncMap(input.replies, (item) =>
        RedditCloneCommentAtSummaryTransformer.transform(item),
      ),
    } satisfies IRedditCloneComment;
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
//             voteScore: true,
//             createdAt: true,
//             updatedAt: true,
//             deletedAt: true,
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
//   post: {IRedditClonePost.ISummary},
//   member: {IRedditCloneMember.ISummary},
//   parent: {IRedditCloneComment.ISummary | null},
//   replies: {Array<IRedditCloneComment.ISummary>},
//         };
//       }
//     }
//--------------------------------------------------------------
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditClonePostVoteTransformer {
  export type Payload = Prisma.reddit_clone_post_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        direction: true,
        created_at: true,
        updated_at: true,
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
            created_at: true,
            vote_score: true,
            comment_count: true,
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
                member: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
            },
          },
        },
      },
    } satisfies Prisma.reddit_clone_post_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditClonePostVote> {
    return {
      id: input.id,
      direction: input.direction,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      member: {
        id: input.member.id,
        username: input.member.username,
      },
      post: {
        id: input.post.id,
        title: input.post.title,
        type: input.post.type as "text" | "link" | "image",
        contentPreview: "",
        createdAt: input.post.created_at.toISOString(),
        voteScore: input.post.vote_score ?? 0,
        commentCount: input.post.comment_count ?? 0,
        author: {
          id: input.post.author.id,
          username: input.post.author.username,
        },
        community: {
          id: input.post.community.id,
          name: input.post.community.name,
          description: input.post.community.description ?? "",
          subscriberCount: input.post.community.subscriber_count ?? 0,
          owner: {
            id: input.post.community.member.id,
            username: input.post.community.member.username,
          },
        },
      },
    } satisfies IRedditClonePostVote;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditClonePostVoteTransformer {
//       export type Payload = Prisma.reddit_clone_post_votesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             direction: true,
//             created_at: true,
//             updated_at: true,
//             reddit_clone_member_id: true,
//             reddit_clone_post_id: true,
//             ...
//           },
//         } satisfies Prisma.reddit_clone_post_votesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditClonePostVote> {
//         return {
//   id: {string},
//   direction: {string},
//   created_at: {string},
//   updated_at: {string},
//   member: {IRedditCloneMember.ISummary},
//   post: {IRedditClonePost.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------
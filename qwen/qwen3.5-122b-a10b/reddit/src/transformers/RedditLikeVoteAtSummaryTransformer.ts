import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeCommentAtSummaryTransformer } from "./RedditLikeCommentAtSummaryTransformer";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";
import { RedditLikePostAtSummaryTransformer } from "./RedditLikePostAtSummaryTransformer";

export namespace RedditLikeVoteAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            username: true,
            id: true,
            created_at: true,
            userProfile: {
              select: {
                display_name: true,
                bio: true,
                avatar: true,
                karma_score: true,
              },
            },
          },
        },
        post: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            title: true,
            content_type: true,
            content_text: true,
            content_url: true,
            comments: {
              select: {
                id: true,
                deleted_at: true,
              },
            },
            community: {
              select: {
                id: true,
                created_at: true,
                name: true,
                description: true,
                icon_url: true,
                owner: {
                  select: {
                    username: true,
                    id: true,
                    created_at: true,
                    userProfile: {
                      select: {
                        display_name: true,
                        bio: true,
                        avatar: true,
                        karma_score: true,
                      },
                    },
                  },
                },
                memberSubscriptions: {
                  select: {
                    id: true,
                  },
                },
              },
            },
            member: {
              select: {
                username: true,
                id: true,
                created_at: true,
                userProfile: {
                  select: {
                    display_name: true,
                    bio: true,
                    avatar: true,
                    karma_score: true,
                  },
                },
              },
            },
            votes: {
              select: {
                id: true,
                deleted_at: true,
                vote_type: true,
              },
            },
            postFile: {
              select: {
                id: true,
                file_url: true,
              },
            },
            reportTargets: {
              select: {
                id: true,
              },
            },
          },
        },
        comment: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            content: true,
            member: {
              select: {
                username: true,
                id: true,
                created_at: true,
                userProfile: {
                  select: {
                    display_name: true,
                    bio: true,
                    avatar: true,
                    karma_score: true,
                  },
                },
              },
            },
            parent: {
              select: {
                id: true,
              },
            },
            post: {
              select: {
                id: true,
              },
            },
            votes: {
              select: {
                id: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                vote_type: true,
                reddit_like_member_id: true,
                reddit_like_post_id: true,
                reddit_like_comment_id: true,
              },
            },
            reports: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    } satisfies Prisma.reddit_like_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeVote.ISummary> {
    const isPost = input.post !== null;
    return {
      id: input.id,
      vote_type: input.vote_type,
      voter: await RedditLikeMemberAtSummaryTransformer.transform(input.member),
      content_type: isPost ? "post" : "comment",
      target: isPost
        ? await RedditLikePostAtSummaryTransformer.transform(input.post!)
        : await RedditLikeCommentAtSummaryTransformer.transform(input.comment!),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    } satisfies IRedditLikeVote.ISummary;
  }
}

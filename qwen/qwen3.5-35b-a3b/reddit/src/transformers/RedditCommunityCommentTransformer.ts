import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityPostAtSummaryTransformer } from "./RedditCommunityPostAtSummaryTransformer";

export namespace RedditCommunityCommentTransformer {
  export type Payload = Prisma.reddit_community_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        votes: true,
        author: {
          select: {
            id: true,
            username: true,
            created_at: true,
            karma: {
              select: { current_score: true },
            },
            userAvatarFiles: {
              select: {
                id: true,
                created_at: true,
              },
            },
          },
        },
        post: RedditCommunityPostAtSummaryTransformer.select(),
        parent: {
          select: {
            id: true,
            created_at: true,
            votes: true,
            parent_comment_id: true,
            author: {
              select: {
                id: true,
                username: true,
                created_at: true,
                karma: { select: { current_score: true } },
                userAvatarFiles: { select: { id: true, created_at: true } },
              },
            },
          },
        },
        replies: {
          select: {
            id: true,
            created_at: true,
            votes: true,
            parent_comment_id: true,
            author: {
              select: {
                id: true,
                username: true,
                created_at: true,
                karma: { select: { current_score: true } },
                userAvatarFiles: { select: { id: true, created_at: true } },
              },
            },
          },
        },
      },
    } satisfies Prisma.reddit_community_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityComment> {
    const upvoteCount = input.votes.filter((v) => v.vote_type === "up").length;
    const downvoteCount = input.votes.filter(
      (v) => v.vote_type === "down",
    ).length;
    const voteScore = upvoteCount - downvoteCount;
    const authorSummary: IRedditCommunityMember.ISummary = {
      id: input.author.id,
      username: input.author.username,
      created_at: toISOStringSafe(input.author.created_at),
      profile:
        input.author.userAvatarFiles?.[0] !== undefined
          ? {
              id: input.author.userAvatarFiles[0].id,
              display_name: "",
              bio: "",
              avatar_image_url: "",
              karma_score: 0,
              created_at: toISOStringSafe(
                input.author.userAvatarFiles[0].created_at,
              ),
            }
          : undefined,
      karma:
        input.author.karma !== null && input.author.karma !== undefined
          ? Number(input.author.karma.current_score)
          : undefined,
    };
    const transformCommentSummary = (comment: {
      id: string;
      created_at: Date;
      votes: {
        vote_type: string;
      }[];
      parent_comment_id: string | null;
      author: {
        id: string;
        username: string;
        created_at: Date;
        karma: {
          current_score: number;
        } | null;
        userAvatarFiles: {
          id: string;
          created_at: Date;
        }[];
      };
    }): IRedditCommunityComment.ISummary => {
      const commentUpvotes = comment.votes.filter(
        (v) => v.vote_type === "up",
      ).length;
      const commentDownvotes = comment.votes.filter(
        (v) => v.vote_type === "down",
      ).length;
      return {
        id: comment.id,
        voteScore: commentUpvotes - commentDownvotes,
        createdAt: toISOStringSafe(comment.created_at),
        parentComment: comment.parent_comment_id,
        replyCount: 0,
        author: {
          id: comment.author.id,
          username: comment.author.username,
          created_at: toISOStringSafe(comment.author.created_at),
          profile:
            comment.author.userAvatarFiles?.[0] !== undefined
              ? {
                  id: comment.author.userAvatarFiles[0].id,
                  display_name: "",
                  bio: "",
                  avatar_image_url: "",
                  karma_score: 0,
                  created_at: toISOStringSafe(
                    comment.author.userAvatarFiles[0].created_at,
                  ),
                }
              : undefined,
          karma:
            comment.author.karma !== null && comment.author.karma !== undefined
              ? Number(comment.author.karma.current_score)
              : undefined,
        },
      };
    };
    return {
      id: input.id,
      body: input.body,
      vote_score: voteScore,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      author: authorSummary,
      post: await RedditCommunityPostAtSummaryTransformer.transform(input.post),
      parent: input.parent
        ? transformCommentSummary({
            id: input.parent.id,
            created_at: input.parent.created_at,
            votes: input.parent.votes,
            parent_comment_id: input.parent.parent_comment_id,
            author: {
              id: input.parent.author.id,
              username: input.parent.author.username,
              created_at: input.parent.author.created_at,
              karma: input.parent.author.karma,
              userAvatarFiles: input.parent.author.userAvatarFiles,
            },
          })
        : undefined,
      replies: await ArrayUtil.asyncMap(input.replies, (reply) =>
        transformCommentSummary({
          id: reply.id,
          created_at: reply.created_at,
          votes: reply.votes,
          parent_comment_id: reply.parent_comment_id,
          author: {
            id: reply.author.id,
            username: reply.author.username,
            created_at: reply.author.created_at,
            karma: reply.author.karma,
            userAvatarFiles: reply.author.userAvatarFiles,
          },
        }),
      ),
    };
  }
}

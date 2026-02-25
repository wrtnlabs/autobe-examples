import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityPlatformAdminCommentsCommentIdVotes(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.IRequest;
}): Promise<ICommunityPlatformComment> {
  // Verify admin access
  await MyGlobal.prisma.community_platform_admins.findFirstOrThrow({
    where: { id: props.admin.id, deleted_at: null },
  });
  // Verify comment existence
  const comment =
    await MyGlobal.prisma.community_platform_comments.findFirstOrThrow({
      where: { id: props.commentId },
    });
  // Use transaction for atomic operations
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Check existing vote using the correct compound key
    const existingVote = await tx.community_platform_comment_votes.findUnique({
      where: {
        user_id_comment_id: {
          comment_id: props.commentId,
          user_id: props.admin.id,
        },
      },
    });
    // Handle vote removal (vote_type: 'none')
    if (props.body.vote_type === "none") {
      if (existingVote) {
        await tx.community_platform_comment_votes.delete({
          where: { id: existingVote.id },
        });
      }
    } else {
      // Handle vote creation/update
      const voteType = props.body.vote_type ?? "upvote";
      if (existingVote) {
        await tx.community_platform_comment_votes.update({
          where: { id: existingVote.id },
          data: {
            vote_type: voteType,
            updated_at: new Date(),
          },
        });
      } else {
        await tx.community_platform_comment_votes.create({
          data: {
            id: v4(),
            user: { connect: { id: props.admin.id } },
            comment: { connect: { id: props.commentId } },
            vote_type: voteType,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }
    }
    // Update aggregated vote scores
    await updateAggregatedVoteScores(tx, props.commentId);
    // Return updated comment with transformer
    const updatedComment =
      await tx.community_platform_comments.findUniqueOrThrow({
        where: { id: props.commentId },
        select: {
          id: true,
          content: true,
          is_deleted: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          author: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatar_url: true,
              karma: true,
              created_at: true,
            },
          } satisfies Prisma.community_platform_usersFindManyArgs,
          post: {
            select: {
              id: true,
              title: true,
              post_type: true,
              author: {
                select: {
                  id: true,
                  username: true,
                  display_name: true,
                  avatar_url: true,
                  karma: true,
                  created_at: true,
                },
              } satisfies Prisma.community_platform_usersFindManyArgs,
              community: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  icon_url: true,
                  owner: {
                    select: {
                      id: true,
                      username: true,
                      display_name: true,
                      avatar_url: true,
                      karma: true,
                      created_at: true,
                    },
                  } satisfies Prisma.community_platform_usersFindManyArgs,
                  created_at: true,
                },
              } satisfies Prisma.community_platform_communitiesFindManyArgs,
              created_at: true,
            },
          } satisfies Prisma.community_platform_postsFindManyArgs,
          parent: {
            select: {
              id: true,
              content: true,
              author: {
                select: {
                  id: true,
                  username: true,
                  display_name: true,
                  avatar_url: true,
                  karma: true,
                  created_at: true,
                },
              } satisfies Prisma.community_platform_usersFindManyArgs,
              post: {
                select: {
                  id: true,
                  title: true,
                  post_type: true,
                  author: {
                    select: {
                      id: true,
                      username: true,
                      display_name: true,
                      avatar_url: true,
                      karma: true,
                      created_at: true,
                    },
                  } satisfies Prisma.community_platform_usersFindManyArgs,
                  community: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      icon_url: true,
                      owner: {
                        select: {
                          id: true,
                          username: true,
                          display_name: true,
                          avatar_url: true,
                          karma: true,
                          created_at: true,
                        },
                      } satisfies Prisma.community_platform_usersFindManyArgs,
                      created_at: true,
                    },
                  } satisfies Prisma.community_platform_communitiesFindManyArgs,
                  created_at: true,
                },
              } satisfies Prisma.community_platform_postsFindManyArgs,
              vote_score: true,
              created_at: true,
              updated_at: true,
            },
          } satisfies Prisma.community_platform_commentsFindManyArgs,
          votes: {
            select: {
              id: true,
            },
          } satisfies Prisma.community_platform_comment_votesFindManyArgs,
          replies: {
            select: {
              id: true,
            },
          } satisfies Prisma.community_platform_commentsFindManyArgs,
        },
      });
    // Calculate vote score
    const voteStats = await tx.community_platform_comment_votes.groupBy({
      by: ["vote_type"],
      where: { comment_id: props.commentId },
      _count: { vote_type: true },
    });
    const upvotes =
      voteStats.find((v) => v.vote_type === "upvote")?._count?.vote_type || 0;
    const downvotes =
      voteStats.find((v) => v.vote_type === "downvote")?._count?.vote_type || 0;
    const vote_score = upvotes - downvotes;
    // Calculate replies count
    const replies_count = await tx.community_platform_comments.count({
      where: { parent_comment_id: props.commentId },
    });
    return {
      id: updatedComment.id,
      content: updatedComment.content,
      is_deleted: updatedComment.is_deleted,
      created_at: toISOStringSafe(updatedComment.created_at),
      updated_at: toISOStringSafe(updatedComment.updated_at),
      deleted_at: updatedComment.deleted_at
        ? toISOStringSafe(updatedComment.deleted_at)
        : null,
      author: {
        id: updatedComment.author.id,
        username: updatedComment.author.username,
        display_name: updatedComment.author.display_name,
        avatar_url: updatedComment.author.avatar_url,
        karma: updatedComment.author.karma,
        created_at: toISOStringSafe(updatedComment.author.created_at),
      } satisfies ICommunityPlatformUser.ISummary,
      post: {
        id: updatedComment.post.id,
        title: updatedComment.post.title,
        post_type: updatedComment.post.post_type,
        author: {
          id: updatedComment.post.author.id,
          username: updatedComment.post.author.username,
          display_name: updatedComment.post.author.display_name,
          avatar_url: updatedComment.post.author.avatar_url,
          karma: updatedComment.post.author.karma,
          created_at: toISOStringSafe(updatedComment.post.author.created_at),
        } satisfies ICommunityPlatformUser.ISummary,
        community: {
          id: updatedComment.post.community.id,
          name: updatedComment.post.community.name,
          description: updatedComment.post.community.description,
          icon_url: updatedComment.post.community.icon_url,
          owner: {
            id: updatedComment.post.community.owner.id,
            username: updatedComment.post.community.owner.username,
            display_name: updatedComment.post.community.owner.display_name,
            avatar_url: updatedComment.post.community.owner.avatar_url,
            karma: updatedComment.post.community.owner.karma,
            created_at: toISOStringSafe(
              updatedComment.post.community.owner.created_at,
            ),
          } satisfies ICommunityPlatformUser.ISummary,
          created_at: toISOStringSafe(updatedComment.post.community.created_at),
        } satisfies ICommunityPlatformCommunity.ISummary,
        created_at: toISOStringSafe(updatedComment.post.created_at),
      } satisfies ICommunityPlatformPost.ISummary,
      parent: updatedComment.parent
        ? ({
            id: updatedComment.parent.id,
            content: updatedComment.parent.content,
            author: {
              id: updatedComment.parent.author.id,
              username: updatedComment.parent.author.username,
              display_name: updatedComment.parent.author.display_name,
              avatar_url: updatedComment.parent.author.avatar_url,
              karma: updatedComment.parent.author.karma,
              created_at: toISOStringSafe(
                updatedComment.parent.author.created_at,
              ),
            } satisfies ICommunityPlatformUser.ISummary,
            post: {
              id: updatedComment.parent.post.id,
              title: updatedComment.parent.post.title,
              post_type: updatedComment.parent.post.post_type,
              author: {
                id: updatedComment.parent.post.author.id,
                username: updatedComment.parent.post.author.username,
                display_name: updatedComment.parent.post.author.display_name,
                avatar_url: updatedComment.parent.post.author.avatar_url,
                karma: updatedComment.parent.post.author.karma,
                created_at: toISOStringSafe(
                  updatedComment.parent.post.author.created_at,
                ),
              } satisfies ICommunityPlatformUser.ISummary,
              community: {
                id: updatedComment.parent.post.community.id,
                name: updatedComment.parent.post.community.name,
                description: updatedComment.parent.post.community.description,
                icon_url: updatedComment.parent.post.community.icon_url,
                owner: {
                  id: updatedComment.parent.post.community.owner.id,
                  username: updatedComment.parent.post.community.owner.username,
                  display_name:
                    updatedComment.parent.post.community.owner.display_name,
                  avatar_url:
                    updatedComment.parent.post.community.owner.avatar_url,
                  karma: updatedComment.parent.post.community.owner.karma,
                  created_at: toISOStringSafe(
                    updatedComment.parent.post.community.owner.created_at,
                  ),
                } satisfies ICommunityPlatformUser.ISummary,
                created_at: toISOStringSafe(
                  updatedComment.parent.post.community.created_at,
                ),
              } satisfies ICommunityPlatformCommunity.ISummary,
              created_at: toISOStringSafe(
                updatedComment.parent.post.created_at,
              ),
            } satisfies ICommunityPlatformPost.ISummary,
            vote_score: updatedComment.parent.vote_score,
            created_at: toISOStringSafe(updatedComment.parent.created_at),
            updated_at: updatedComment.parent.updated_at
              ? toISOStringSafe(updatedComment.parent.updated_at)
              : null,
          } satisfies ICommunityPlatformComment.ISummary)
        : null,
      vote_score,
      replies_count,
    };
  });
}
// Helper function to update aggregated vote scores
async function updateAggregatedVoteScores(tx: any, commentId: string) {
  const voteStats = await tx.community_platform_comment_votes.groupBy({
    by: ["vote_type"],
    where: { comment_id: commentId },
    _count: { vote_type: true },
  });
  const upvotes =
    voteStats.find((v) => v.vote_type === "upvote")?._count?.vote_type || 0;
  const downvotes =
    voteStats.find((v) => v.vote_type === "downvote")?._count?.vote_type || 0;
  const score = upvotes - downvotes;
  // Upsert aggregated score
  await tx.community_platform_comment_vote_scores.upsert({
    where: { comment_id: commentId },
    update: { score, upvotes, downvotes },
    create: {
      id: v4(),
      comment_id: commentId,
      score,
      upvotes,
      downvotes,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
}

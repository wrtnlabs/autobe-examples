import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { IRedditCommunitySystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemLog";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunitySystemLogTransformer {
  export type Payload = Prisma.reddit_community_system_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        activity_type: true,
        action_performed: true,
        target_type: true,
        metadata: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        actor: { select: { id: true } },
        targetPost: { select: { id: true } },
        targetComment: { select: { id: true } },
        targetCommunity: { select: { id: true } },
        targetReport: { select: { id: true } },
      },
    } satisfies Prisma.reddit_community_system_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunitySystemLog> {
    const actor = await resolveActor(input.actor);
    const targetPost = await resolveTargetPost(input.targetPost);
    const targetComment = await resolveTargetComment(input.targetComment);
    const targetCommunity = await resolveTargetCommunity(input.targetCommunity);
    const targetReport = await resolveTargetReport(input.targetReport);
    return {
      id: input.id,
      actor: actor ?? undefined,
      targetPost: targetPost ?? undefined,
      targetComment: targetComment ?? undefined,
      targetCommunity: targetCommunity ?? undefined,
      targetReport: targetReport ?? undefined,
      activity_type: input.activity_type,
      action_performed: input.action_performed,
      target_type:
        (input.target_type as IRedditCommunitySystemLog["target_type"]) ??
        undefined,
      metadata: input.metadata ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
  async function resolveActor(
    actor:
      | {
          id: string;
        }
      | null
      | undefined,
  ) {
    if (!actor || !actor.id) return null;
    try {
      const member = await MyGlobal.prisma.reddit_community_members.findUnique({
        where: { id: actor.id },
        select: {
          id: true,
          username: true,
          created_at: true,
          karma: { select: { current_score: true } },
        },
      });
      if (!member) return null;
      return {
        id: member.id,
        username: member.username,
        created_at: toISOStringSafe(member.created_at),
        karma: member.karma?.current_score ?? undefined,
      };
    } catch {
      return null;
    }
  }
  async function resolveTargetPost(
    post:
      | {
          id: string;
        }
      | null
      | undefined,
  ) {
    if (!post || !post.id) return null;
    try {
      const postRecord =
        await MyGlobal.prisma.reddit_community_posts.findUnique({
          where: { id: post.id },
          select: {
            id: true,
            title: true,
            vote_score: true,
            comment_count: true,
            created_at: true,
            post_type: true,
            author: {
              select: {
                id: true,
                username: true,
                created_at: true,
                karma: { select: { current_score: true } },
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
                owner: {
                  select: {
                    id: true,
                    created_at: true,
                    username: true,
                    karma: { select: { current_score: true } },
                  },
                },
              },
            },
          },
        });
      if (!postRecord) return null;
      return {
        id: postRecord.id,
        title: postRecord.title,
        author: {
          id: postRecord.author.id,
          username: postRecord.author.username,
          created_at: toISOStringSafe(postRecord.author.created_at),
          karma: postRecord.author.karma?.current_score ?? undefined,
        },
        community: {
          id: postRecord.community.id,
          name: postRecord.community.name,
          description: postRecord.community.description,
          subscriber_count: postRecord.community.subscriber_count,
          owner: {
            id: postRecord.community.owner.id,
            created_at: toISOStringSafe(postRecord.community.owner.created_at),
            username: postRecord.community.owner.username,
            karma: postRecord.community.owner.karma?.current_score ?? undefined,
          },
          created_at: toISOStringSafe(postRecord.community.created_at),
          updated_at: toISOStringSafe(postRecord.community.updated_at),
          deleted_at: postRecord.community.deleted_at
            ? toISOStringSafe(postRecord.community.deleted_at)
            : null,
        },
        vote_score: postRecord.vote_score,
        comment_count: postRecord.comment_count,
        created_at: toISOStringSafe(postRecord.created_at),
        post_type: postRecord.post_type as "text" | "link" | "image",
        preview_content: null,
      };
    } catch {
      return null;
    }
  }
  async function resolveTargetComment(
    comment:
      | {
          id: string;
        }
      | null
      | undefined,
  ): Promise<IRedditCommunityComment.ISummary | null> {
    if (!comment || !comment.id) return null;
    try {
      const commentRecord =
        await MyGlobal.prisma.reddit_community_comments.findUnique({
          where: { id: comment.id },
          select: {
            id: true,
            created_at: true,
            author: {
              select: {
                id: true,
                username: true,
                created_at: true,
                karma: { select: { current_score: true } },
              },
            },
            parent_comment_id: true,
            replies: { select: { id: true } },
            votes: { select: { vote_type: true } },
          },
        });
      if (!commentRecord) return null;
      const voteUpCount = commentRecord.votes.filter(
        (v) => v.vote_type === "up",
      ).length;
      const voteDownCount = commentRecord.votes.filter(
        (v) => v.vote_type === "down",
      ).length;
      const parentComment: IRedditCommunityComment.ISummary | null =
        commentRecord.parent_comment_id
          ? await resolveTargetComment({ id: commentRecord.parent_comment_id })
          : null;
      return {
        id: commentRecord.id,
        voteScore: voteUpCount - voteDownCount,
        createdAt: toISOStringSafe(commentRecord.created_at),
        parentComment,
        replyCount: commentRecord.replies.length,
        author: {
          id: commentRecord.author.id,
          username: commentRecord.author.username,
          created_at: toISOStringSafe(commentRecord.author.created_at),
          karma: commentRecord.author.karma?.current_score ?? undefined,
        },
      };
    } catch {
      return null;
    }
  }
  async function resolveTargetCommunity(
    community:
      | {
          id: string;
        }
      | null
      | undefined,
  ) {
    if (!community || !community.id) return null;
    try {
      const communityRecord =
        await MyGlobal.prisma.reddit_community_communities.findUnique({
          where: { id: community.id },
          select: {
            id: true,
            name: true,
            description: true,
            subscriber_count: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            owner: {
              select: {
                id: true,
                created_at: true,
                username: true,
                karma: { select: { current_score: true } },
              },
            },
          },
        });
      if (!communityRecord) return null;
      return {
        id: communityRecord.id,
        name: communityRecord.name,
        description: communityRecord.description,
        subscriber_count: communityRecord.subscriber_count,
        owner: {
          id: communityRecord.owner.id,
          created_at: toISOStringSafe(communityRecord.owner.created_at),
          username: communityRecord.owner.username,
          karma: communityRecord.owner.karma?.current_score ?? undefined,
        },
        created_at: toISOStringSafe(communityRecord.created_at),
        updated_at: toISOStringSafe(communityRecord.updated_at),
        deleted_at: communityRecord.deleted_at
          ? toISOStringSafe(communityRecord.deleted_at)
          : null,
      };
    } catch {
      return null;
    }
  }
  async function resolveTargetReport(
    report:
      | {
          id: string;
        }
      | null
      | undefined,
  ) {
    if (!report || !report.id) return null;
    try {
      const reportRecord =
        await MyGlobal.prisma.reddit_community_reports.findUnique({
          where: { id: report.id },
          select: {
            id: true,
            target_type: true,
            target_id: true,
            reason: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            reporter: {
              select: {
                id: true,
                username: true,
                created_at: true,
                karma: { select: { current_score: true } },
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
                owner: {
                  select: {
                    id: true,
                    created_at: true,
                    username: true,
                    karma: { select: { current_score: true } },
                  },
                },
              },
            },
          },
        });
      if (!reportRecord) return null;
      return {
        id: reportRecord.id,
        reporter: {
          id: reportRecord.reporter.id,
          username: reportRecord.reporter.username,
          created_at: toISOStringSafe(reportRecord.reporter.created_at),
          karma: reportRecord.reporter.karma?.current_score ?? undefined,
        },
        community: {
          id: reportRecord.community.id,
          name: reportRecord.community.name,
          description: reportRecord.community.description,
          subscriber_count: reportRecord.community.subscriber_count,
          owner: {
            id: reportRecord.community.owner.id,
            created_at: toISOStringSafe(
              reportRecord.community.owner.created_at,
            ),
            username: reportRecord.community.owner.username,
            karma:
              reportRecord.community.owner.karma?.current_score ?? undefined,
          },
          created_at: toISOStringSafe(reportRecord.community.created_at),
          updated_at: toISOStringSafe(reportRecord.community.updated_at),
          deleted_at: reportRecord.community.deleted_at
            ? toISOStringSafe(reportRecord.community.deleted_at)
            : null,
        },
        target_type: reportRecord.target_type as "post" | "comment",
        target_id: reportRecord.target_id,
        reason: reportRecord.reason,
        status: reportRecord.status as "pending" | "approved" | "dismissed",
        created_at: toISOStringSafe(reportRecord.created_at),
        updated_at: toISOStringSafe(reportRecord.updated_at),
        deleted_at: reportRecord.deleted_at
          ? toISOStringSafe(reportRecord.deleted_at)
          : null,
      };
    } catch {
      return null;
    }
  }
}

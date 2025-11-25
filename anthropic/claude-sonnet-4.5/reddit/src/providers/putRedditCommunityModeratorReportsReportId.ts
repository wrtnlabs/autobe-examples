import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putRedditCommunityModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCommunityReport.IUpdate;
}): Promise<IRedditCommunityReport> {
  const existingReport =
    await MyGlobal.prisma.reddit_community_reports.findUnique({
      where: { id: props.reportId },
    });

  if (!existingReport) {
    throw new HttpException("Report not found", 404);
  }

  const moderatorAuthorization =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: existingReport.reddit_community_community_id,
      },
    });

  if (!moderatorAuthorization) {
    throw new HttpException(
      "You do not have moderation authority in this community",
      403,
    );
  }

  const now = toISOStringSafe(new Date());

  const updatedReport = await MyGlobal.prisma.reddit_community_reports.update({
    where: { id: props.reportId },
    data: {
      ...(props.body.status !== undefined && { status: props.body.status }),
      updated_at: now,
    },
  });

  const reporter = await MyGlobal.prisma.reddit_community_members.findUnique({
    where: { id: updatedReport.reddit_community_member_id },
  });

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: updatedReport.reddit_community_community_id },
    });

  if (!reporter || !community) {
    throw new HttpException("Reporter or community not found", 404);
  }

  const reporterSummary: IRedditCommunityGuest.ISummary = {
    id: reporter.id,
    username: reporter.username,
    display_name:
      reporter.display_name === null ? undefined : reporter.display_name,
    bio: reporter.bio === null ? undefined : reporter.bio,
    avatar_url: reporter.avatar_url === null ? undefined : reporter.avatar_url,
    post_karma: reporter.post_karma,
    comment_karma: reporter.comment_karma,
    created_at: toISOStringSafe(reporter.created_at),
  };

  const communitySummary: IRedditCommunity.ISummary = {
    id: community.id,
    name: community.name,
    display_title: community.display_title,
    description: community.description,
    icon_url: community.icon_url === null ? undefined : community.icon_url,
    banner_url:
      community.banner_url === null ? undefined : community.banner_url,
    subscriber_count: community.subscriber_count,
    post_count: community.post_count,
    created_at: toISOStringSafe(community.created_at),
  };

  let targetPostSummary: IRedditCommunityPost.ISummary | null | undefined =
    undefined;
  let targetCommentSummary:
    | IRedditCommunityComment.ISummary
    | null
    | undefined = undefined;

  if (updatedReport.content_type === "post") {
    const reportOfPost =
      await MyGlobal.prisma.reddit_community_report_of_posts.findUnique({
        where: { reddit_community_report_id: updatedReport.id },
      });

    if (reportOfPost) {
      const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
        where: { id: reportOfPost.reddit_community_post_id },
      });

      if (post) {
        const postAuthor =
          await MyGlobal.prisma.reddit_community_members.findUnique({
            where: { id: post.reddit_community_member_id },
          });

        const postCommunity =
          await MyGlobal.prisma.reddit_community_communities.findUnique({
            where: { id: post.reddit_community_community_id },
          });

        if (postAuthor && postCommunity) {
          targetPostSummary = {
            id: post.id,
            title: post.title,
            post_type: typia.assert<"text" | "link" | "image">(post.post_type),
            vote_score: 0,
            comment_count: 0,
            edited: post.edited,
            created_at: toISOStringSafe(post.created_at),
            author: {
              id: postAuthor.id,
              username: postAuthor.username,
              display_name:
                postAuthor.display_name === null
                  ? undefined
                  : postAuthor.display_name,
              bio: postAuthor.bio === null ? undefined : postAuthor.bio,
              avatar_url:
                postAuthor.avatar_url === null
                  ? undefined
                  : postAuthor.avatar_url,
              post_karma: postAuthor.post_karma,
              comment_karma: postAuthor.comment_karma,
              created_at: toISOStringSafe(postAuthor.created_at),
            },
            community: {
              id: postCommunity.id,
              name: postCommunity.name,
              display_title: postCommunity.display_title,
              description: postCommunity.description,
              icon_url:
                postCommunity.icon_url === null
                  ? undefined
                  : postCommunity.icon_url,
              banner_url:
                postCommunity.banner_url === null
                  ? undefined
                  : postCommunity.banner_url,
              subscriber_count: postCommunity.subscriber_count,
              post_count: postCommunity.post_count,
              created_at: toISOStringSafe(postCommunity.created_at),
            },
          };
        }
      }
    }
  } else if (updatedReport.content_type === "comment") {
    const reportOfComment =
      await MyGlobal.prisma.reddit_community_report_of_comments.findUnique({
        where: { reddit_community_report_id: updatedReport.id },
      });

    if (reportOfComment) {
      const comment =
        await MyGlobal.prisma.reddit_community_comments.findUnique({
          where: { id: reportOfComment.reddit_community_comment_id },
        });

      if (comment) {
        const commentAuthor =
          await MyGlobal.prisma.reddit_community_members.findUnique({
            where: { id: comment.reddit_community_member_id },
          });

        const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
          where: { id: comment.reddit_community_post_id },
        });

        if (commentAuthor && post) {
          const postAuthor =
            await MyGlobal.prisma.reddit_community_members.findUnique({
              where: { id: post.reddit_community_member_id },
            });

          const postCommunity =
            await MyGlobal.prisma.reddit_community_communities.findUnique({
              where: { id: post.reddit_community_community_id },
            });

          if (postAuthor && postCommunity) {
            targetCommentSummary = {
              id: comment.id,
              body: comment.body,
              depth: comment.depth,
              edited: comment.edited,
              created_at: toISOStringSafe(comment.created_at),
              author: {
                id: commentAuthor.id,
                username: commentAuthor.username,
                display_name:
                  commentAuthor.display_name === null
                    ? undefined
                    : commentAuthor.display_name,
                bio: commentAuthor.bio === null ? undefined : commentAuthor.bio,
                avatar_url:
                  commentAuthor.avatar_url === null
                    ? undefined
                    : commentAuthor.avatar_url,
                post_karma: commentAuthor.post_karma,
                comment_karma: commentAuthor.comment_karma,
                created_at: toISOStringSafe(commentAuthor.created_at),
              },
              post: {
                id: post.id,
                title: post.title,
                post_type: typia.assert<"text" | "link" | "image">(
                  post.post_type,
                ),
                vote_score: 0,
                comment_count: 0,
                edited: post.edited,
                created_at: toISOStringSafe(post.created_at),
                author: {
                  id: postAuthor.id,
                  username: postAuthor.username,
                  display_name:
                    postAuthor.display_name === null
                      ? undefined
                      : postAuthor.display_name,
                  bio: postAuthor.bio === null ? undefined : postAuthor.bio,
                  avatar_url:
                    postAuthor.avatar_url === null
                      ? undefined
                      : postAuthor.avatar_url,
                  post_karma: postAuthor.post_karma,
                  comment_karma: postAuthor.comment_karma,
                  created_at: toISOStringSafe(postAuthor.created_at),
                },
                community: {
                  id: postCommunity.id,
                  name: postCommunity.name,
                  display_title: postCommunity.display_title,
                  description: postCommunity.description,
                  icon_url:
                    postCommunity.icon_url === null
                      ? undefined
                      : postCommunity.icon_url,
                  banner_url:
                    postCommunity.banner_url === null
                      ? undefined
                      : postCommunity.banner_url,
                  subscriber_count: postCommunity.subscriber_count,
                  post_count: postCommunity.post_count,
                  created_at: toISOStringSafe(postCommunity.created_at),
                },
              },
            };
          }
        }
      }
    }
  }

  return {
    id: updatedReport.id,
    content_type: typia.assert<"post" | "comment">(updatedReport.content_type),
    reddit_community_member_id: updatedReport.reddit_community_member_id,
    reddit_community_community_id: updatedReport.reddit_community_community_id,
    category: typia.assert<
      | "spam"
      | "harassment"
      | "hate_speech"
      | "misinformation"
      | "sexual_content"
      | "violence"
      | "personal_information"
      | "copyright"
      | "self_harm"
      | "other"
    >(updatedReport.category),
    description:
      updatedReport.description === null
        ? undefined
        : updatedReport.description,
    status: typia.assert<
      | "pending"
      | "under_review"
      | "resolved_action_taken"
      | "resolved_no_violation"
      | "dismissed"
    >(updatedReport.status),
    resolution: props.body.resolution,
    moderator_notes: props.body.moderator_notes,
    created_at: toISOStringSafe(updatedReport.created_at),
    updated_at: toISOStringSafe(updatedReport.updated_at),
    deleted_at: updatedReport.deleted_at
      ? toISOStringSafe(updatedReport.deleted_at)
      : undefined,
    reporter: reporterSummary,
    community: communitySummary,
    target_post: targetPostSummary,
    target_comment: targetCommentSummary,
  };
}

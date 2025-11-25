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

export async function getRedditCommunityModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityReport> {
  const report = await MyGlobal.prisma.reddit_community_reports.findUnique({
    where: { id: props.reportId },
  });

  if (!report) {
    throw new HttpException("Report not found", 404);
  }

  const [reporter, community, reportOfPost, reportOfComment] =
    await Promise.all([
      MyGlobal.prisma.reddit_community_members.findUnique({
        where: { id: report.reddit_community_member_id },
      }),
      MyGlobal.prisma.reddit_community_communities.findUnique({
        where: { id: report.reddit_community_community_id },
      }),
      report.content_type === "post"
        ? MyGlobal.prisma.reddit_community_report_of_posts.findFirst({
            where: { reddit_community_report_id: report.id },
          })
        : null,
      report.content_type === "comment"
        ? MyGlobal.prisma.reddit_community_report_of_comments.findFirst({
            where: { reddit_community_report_id: report.id },
          })
        : null,
    ]);

  let targetPost = null;
  let targetComment = null;

  if (reportOfPost) {
    const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
      where: { id: reportOfPost.reddit_community_post_id },
    });
    if (post) {
      const [postAuthor, postCommunity] = await Promise.all([
        MyGlobal.prisma.reddit_community_members.findUnique({
          where: { id: post.reddit_community_member_id },
        }),
        MyGlobal.prisma.reddit_community_communities.findUnique({
          where: { id: post.reddit_community_community_id },
        }),
      ]);

      if (postAuthor && postCommunity) {
        targetPost = {
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

  if (reportOfComment) {
    const comment = await MyGlobal.prisma.reddit_community_comments.findUnique({
      where: { id: reportOfComment.reddit_community_comment_id },
    });
    if (comment) {
      const [commentAuthor, commentPost] = await Promise.all([
        MyGlobal.prisma.reddit_community_members.findUnique({
          where: { id: comment.reddit_community_member_id },
        }),
        MyGlobal.prisma.reddit_community_posts.findUnique({
          where: { id: comment.reddit_community_post_id },
        }),
      ]);

      if (commentAuthor && commentPost) {
        const [commentPostAuthor, commentPostCommunity] = await Promise.all([
          MyGlobal.prisma.reddit_community_members.findUnique({
            where: { id: commentPost.reddit_community_member_id },
          }),
          MyGlobal.prisma.reddit_community_communities.findUnique({
            where: { id: commentPost.reddit_community_community_id },
          }),
        ]);

        if (commentPostAuthor && commentPostCommunity) {
          targetComment = {
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
              id: commentPost.id,
              title: commentPost.title,
              post_type: typia.assert<"text" | "link" | "image">(
                commentPost.post_type,
              ),
              vote_score: 0,
              comment_count: 0,
              edited: commentPost.edited,
              created_at: toISOStringSafe(commentPost.created_at),
              author: {
                id: commentPostAuthor.id,
                username: commentPostAuthor.username,
                display_name:
                  commentPostAuthor.display_name === null
                    ? undefined
                    : commentPostAuthor.display_name,
                bio:
                  commentPostAuthor.bio === null
                    ? undefined
                    : commentPostAuthor.bio,
                avatar_url:
                  commentPostAuthor.avatar_url === null
                    ? undefined
                    : commentPostAuthor.avatar_url,
                post_karma: commentPostAuthor.post_karma,
                comment_karma: commentPostAuthor.comment_karma,
                created_at: toISOStringSafe(commentPostAuthor.created_at),
              },
              community: {
                id: commentPostCommunity.id,
                name: commentPostCommunity.name,
                display_title: commentPostCommunity.display_title,
                description: commentPostCommunity.description,
                icon_url:
                  commentPostCommunity.icon_url === null
                    ? undefined
                    : commentPostCommunity.icon_url,
                banner_url:
                  commentPostCommunity.banner_url === null
                    ? undefined
                    : commentPostCommunity.banner_url,
                subscriber_count: commentPostCommunity.subscriber_count,
                post_count: commentPostCommunity.post_count,
                created_at: toISOStringSafe(commentPostCommunity.created_at),
              },
            },
          };
        }
      }
    }
  }

  return {
    id: report.id,
    content_type: typia.assert<"post" | "comment">(report.content_type),
    reddit_community_member_id: report.reddit_community_member_id,
    reddit_community_community_id: report.reddit_community_community_id,
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
    >(report.category),
    description: report.description === null ? undefined : report.description,
    status: typia.assert<
      | "pending"
      | "under_review"
      | "resolved_action_taken"
      | "resolved_no_violation"
      | "dismissed"
    >(report.status),
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at: report.deleted_at
      ? toISOStringSafe(report.deleted_at)
      : undefined,
    reporter: reporter
      ? {
          id: reporter.id,
          username: reporter.username,
          display_name:
            reporter.display_name === null ? undefined : reporter.display_name,
          bio: reporter.bio === null ? undefined : reporter.bio,
          avatar_url:
            reporter.avatar_url === null ? undefined : reporter.avatar_url,
          post_karma: reporter.post_karma,
          comment_karma: reporter.comment_karma,
          created_at: toISOStringSafe(reporter.created_at),
        }
      : undefined,
    community: community
      ? {
          id: community.id,
          name: community.name,
          display_title: community.display_title,
          description: community.description,
          icon_url:
            community.icon_url === null ? undefined : community.icon_url,
          banner_url:
            community.banner_url === null ? undefined : community.banner_url,
          subscriber_count: community.subscriber_count,
          post_count: community.post_count,
          created_at: toISOStringSafe(community.created_at),
        }
      : undefined,
    target_post: targetPost,
    target_comment: targetComment,
  };
}

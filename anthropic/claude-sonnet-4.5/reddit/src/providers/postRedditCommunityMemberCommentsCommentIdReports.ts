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
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditCommunityMemberCommentsCommentIdReports(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityReport.ICreate;
}): Promise<IRedditCommunityReport> {
  const comment = await MyGlobal.prisma.reddit_community_comments.findUnique({
    where: { id: props.commentId },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: comment.reddit_community_post_id },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  if (
    post.reddit_community_community_id !==
    props.body.reddit_community_community_id
  ) {
    throw new HttpException(
      "Comment does not belong to the specified community",
      400,
    );
  }

  const now = toISOStringSafe(new Date());
  const reportId = v4() as string & tags.Format<"uuid">;

  await MyGlobal.prisma.reddit_community_reports.create({
    data: {
      id: reportId,
      content_type: "comment",
      reddit_community_member_id: props.member.id,
      reddit_community_community_id: props.body.reddit_community_community_id,
      category: props.body.category,
      description: props.body.description ?? null,
      status: "pending",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  await MyGlobal.prisma.reddit_community_report_of_comments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_community_report_id: reportId,
      reddit_community_comment_id: props.commentId,
      created_at: now,
    },
  });

  const [
    reporter,
    community,
    commentAuthor,
    postAuthor,
    communityData,
    postCommentCount,
  ] = await Promise.all([
    MyGlobal.prisma.reddit_community_members.findUnique({
      where: { id: props.member.id },
    }),
    MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: props.body.reddit_community_community_id },
    }),
    MyGlobal.prisma.reddit_community_members.findUnique({
      where: { id: comment.reddit_community_member_id },
    }),
    MyGlobal.prisma.reddit_community_members.findUnique({
      where: { id: post.reddit_community_member_id },
    }),
    MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: post.reddit_community_community_id },
    }),
    MyGlobal.prisma.reddit_community_comments.count({
      where: { reddit_community_post_id: post.id, deleted_at: null },
    }),
  ]);

  return {
    id: reportId,
    content_type: "comment",
    reddit_community_member_id: props.member.id,
    reddit_community_community_id: props.body.reddit_community_community_id,
    category: props.body.category,
    description:
      props.body.description === null ? undefined : props.body.description,
    status: "pending",
    resolution: undefined,
    moderator_notes: undefined,
    created_at: now,
    updated_at: now,
    deleted_at: undefined,
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
    target_comment:
      comment && commentAuthor && postAuthor && communityData
        ? {
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
              post_type: post.post_type as "link" | "text" | "image",
              vote_score: 0,
              comment_count: postCommentCount,
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
                id: communityData.id,
                name: communityData.name,
                display_title: communityData.display_title,
                description: communityData.description,
                icon_url:
                  communityData.icon_url === null
                    ? undefined
                    : communityData.icon_url,
                banner_url:
                  communityData.banner_url === null
                    ? undefined
                    : communityData.banner_url,
                subscriber_count: communityData.subscriber_count,
                post_count: communityData.post_count,
                created_at: toISOStringSafe(communityData.created_at),
              },
            },
          }
        : null,
    target_post: null,
  };
}

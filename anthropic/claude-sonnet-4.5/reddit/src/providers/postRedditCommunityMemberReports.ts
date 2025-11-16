import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function postRedditCommunityMemberReports(props: {
  member: MemberPayload;
  body: IRedditCommunityReport.ICreate;
}): Promise<IRedditCommunityReport> {
  const now = new Date();
  const reportId = v4() as string & tags.Format<"uuid">;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: props.body.reddit_community_community_id },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  if (props.body.content_type === "post") {
    const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
      where: { id: props.body.target_content_id },
    });

    if (!post) {
      throw new HttpException("Post not found", 404);
    }

    if (
      post.reddit_community_community_id !==
      props.body.reddit_community_community_id
    ) {
      throw new HttpException(
        "Post does not belong to the specified community",
        400,
      );
    }
  } else {
    const comment = await MyGlobal.prisma.reddit_community_comments.findUnique({
      where: { id: props.body.target_content_id },
    });

    if (!comment) {
      throw new HttpException("Comment not found", 404);
    }

    const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
      where: { id: comment.reddit_community_post_id },
    });

    if (
      !post ||
      post.reddit_community_community_id !==
        props.body.reddit_community_community_id
    ) {
      throw new HttpException(
        "Comment does not belong to the specified community",
        400,
      );
    }
  }

  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.reddit_community_reports.create({
      data: {
        id: reportId,
        content_type: props.body.content_type,
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

    if (props.body.content_type === "post") {
      await tx.reddit_community_report_of_posts.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          reddit_community_report_id: reportId,
          reddit_community_post_id: props.body.target_content_id,
          created_at: now,
        },
      });
    } else {
      await tx.reddit_community_report_of_comments.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          reddit_community_report_id: reportId,
          reddit_community_comment_id: props.body.target_content_id,
          created_at: now,
        },
      });
    }
  });

  const reporter = await MyGlobal.prisma.reddit_community_members.findUnique({
    where: { id: props.member.id },
  });

  if (!reporter) {
    throw new HttpException("Reporter not found", 500);
  }

  let targetPost: IRedditCommunityPost.ISummary | undefined;
  let targetComment: IRedditCommunityComment.ISummary | undefined;

  if (props.body.content_type === "post") {
    const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
      where: { id: props.body.target_content_id },
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
            display_name: postAuthor.display_name ?? undefined,
            bio: postAuthor.bio ?? undefined,
            avatar_url: postAuthor.avatar_url ?? undefined,
            post_karma: postAuthor.post_karma,
            comment_karma: postAuthor.comment_karma,
            created_at: toISOStringSafe(postAuthor.created_at),
          },
          community: {
            id: postCommunity.id,
            name: postCommunity.name,
            display_title: postCommunity.display_title,
            description: postCommunity.description,
            icon_url: postCommunity.icon_url ?? undefined,
            banner_url: postCommunity.banner_url ?? undefined,
            subscriber_count: postCommunity.subscriber_count,
            post_count: postCommunity.post_count,
            created_at: toISOStringSafe(postCommunity.created_at),
          },
        };
      }
    }
  } else {
    const comment = await MyGlobal.prisma.reddit_community_comments.findUnique({
      where: { id: props.body.target_content_id },
    });

    if (comment) {
      const commentAuthor =
        await MyGlobal.prisma.reddit_community_members.findUnique({
          where: { id: comment.reddit_community_member_id },
        });

      const commentPost =
        await MyGlobal.prisma.reddit_community_posts.findUnique({
          where: { id: comment.reddit_community_post_id },
        });

      if (commentAuthor && commentPost) {
        const postAuthor =
          await MyGlobal.prisma.reddit_community_members.findUnique({
            where: { id: commentPost.reddit_community_member_id },
          });

        const postCommunity =
          await MyGlobal.prisma.reddit_community_communities.findUnique({
            where: { id: commentPost.reddit_community_community_id },
          });

        if (postAuthor && postCommunity) {
          targetComment = {
            id: comment.id,
            body: comment.body,
            depth: comment.depth,
            edited: comment.edited,
            created_at: toISOStringSafe(comment.created_at),
            author: {
              id: commentAuthor.id,
              username: commentAuthor.username,
              display_name: commentAuthor.display_name ?? undefined,
              bio: commentAuthor.bio ?? undefined,
              avatar_url: commentAuthor.avatar_url ?? undefined,
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
                id: postAuthor.id,
                username: postAuthor.username,
                display_name: postAuthor.display_name ?? undefined,
                bio: postAuthor.bio ?? undefined,
                avatar_url: postAuthor.avatar_url ?? undefined,
                post_karma: postAuthor.post_karma,
                comment_karma: postAuthor.comment_karma,
                created_at: toISOStringSafe(postAuthor.created_at),
              },
              community: {
                id: postCommunity.id,
                name: postCommunity.name,
                display_title: postCommunity.display_title,
                description: postCommunity.description,
                icon_url: postCommunity.icon_url ?? undefined,
                banner_url: postCommunity.banner_url ?? undefined,
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

  return {
    id: reportId,
    content_type: props.body.content_type,
    reddit_community_member_id: props.member.id,
    reddit_community_community_id: props.body.reddit_community_community_id,
    category: props.body.category,
    description: props.body.description ?? undefined,
    status: "pending",
    resolution: undefined,
    moderator_notes: undefined,
    created_at: toISOStringSafe(now),
    updated_at: toISOStringSafe(now),
    deleted_at: undefined,
    reporter: {
      id: reporter.id,
      username: reporter.username,
      display_name: reporter.display_name ?? undefined,
      bio: reporter.bio ?? undefined,
      avatar_url: reporter.avatar_url ?? undefined,
      post_karma: reporter.post_karma,
      comment_karma: reporter.comment_karma,
      created_at: toISOStringSafe(reporter.created_at),
    },
    community: {
      id: community.id,
      name: community.name,
      display_title: community.display_title,
      description: community.description,
      icon_url: community.icon_url ?? undefined,
      banner_url: community.banner_url ?? undefined,
      subscriber_count: community.subscriber_count,
      post_count: community.post_count,
      created_at: toISOStringSafe(community.created_at),
    },
    target_post: targetPost,
    target_comment: targetComment,
  };
}

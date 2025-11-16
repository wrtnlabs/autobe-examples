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

export async function postRedditCommunityMemberPostsPostIdReports(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityReport.ICreate;
}): Promise<IRedditCommunityReport> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.postId },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  const now = new Date();
  const reportId = v4() as string & tags.Format<"uuid">;

  await MyGlobal.prisma.reddit_community_reports.create({
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

  await MyGlobal.prisma.reddit_community_report_of_posts.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_community_report_id: reportId,
      reddit_community_post_id: props.postId,
      created_at: now,
    },
  });

  const [member, community, postAuthor, postCommunity] = await Promise.all([
    MyGlobal.prisma.reddit_community_members.findUnique({
      where: { id: props.member.id },
    }),
    MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: props.body.reddit_community_community_id },
    }),
    MyGlobal.prisma.reddit_community_members.findUnique({
      where: { id: post.reddit_community_member_id },
    }),
    MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: post.reddit_community_community_id },
    }),
  ]);

  if (!member || !community || !postAuthor || !postCommunity) {
    throw new HttpException("Failed to retrieve related data", 500);
  }

  return {
    id: reportId,
    content_type: typia.assert<"post" | "comment">(props.body.content_type),
    reddit_community_member_id: props.member.id,
    reddit_community_community_id: props.body.reddit_community_community_id,
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
    >(props.body.category),
    description: props.body.description ?? undefined,
    status: "pending",
    resolution: undefined,
    moderator_notes: undefined,
    created_at: toISOStringSafe(now),
    updated_at: toISOStringSafe(now),
    deleted_at: undefined,
    reporter: {
      id: member.id,
      username: member.username,
      display_name:
        member.display_name === null ? undefined : member.display_name,
      bio: member.bio === null ? undefined : member.bio,
      avatar_url: member.avatar_url === null ? undefined : member.avatar_url,
      post_karma: member.post_karma,
      comment_karma: member.comment_karma,
      created_at: toISOStringSafe(member.created_at),
    },
    community: {
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
    },
    target_post: {
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
          postAuthor.avatar_url === null ? undefined : postAuthor.avatar_url,
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
          postCommunity.icon_url === null ? undefined : postCommunity.icon_url,
        banner_url:
          postCommunity.banner_url === null
            ? undefined
            : postCommunity.banner_url,
        subscriber_count: postCommunity.subscriber_count,
        post_count: postCommunity.post_count,
        created_at: toISOStringSafe(postCommunity.created_at),
      },
    },
    target_comment: undefined,
  };
}

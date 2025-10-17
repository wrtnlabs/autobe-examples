import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

export async function getRedditCommunityCommunitiesCommunityIdPostsPostId(props: {
  communityId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityPost> {
  const { communityId, postId } = props;

  const post = await MyGlobal.prisma.reddit_community_posts.findFirstOrThrow({
    where: {
      id: postId,
      reddit_community_community_id: communityId,
      deleted_at: null,
    },
    select: {
      id: true,
      author_member_id: true,
      author_guest_id: true,
      reddit_community_community_id: true,
      post_type: true,
      title: true,
      body_text: true,
      link_url: true,
      image_url: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      status: true,
      business_status: true,
    },
  });

  return {
    id: post.id,
    author_member_id:
      post.author_member_id === null ? undefined : post.author_member_id,
    author_guest_id:
      post.author_guest_id === null ? undefined : post.author_guest_id,
    reddit_community_community_id: post.reddit_community_community_id,
    post_type: post.post_type,
    title: post.title,
    body_text: post.body_text === null ? undefined : post.body_text,
    link_url: post.link_url === null ? undefined : post.link_url,
    image_url: post.image_url === null ? undefined : post.image_url,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    deleted_at:
      post.deleted_at === null ? undefined : toISOStringSafe(post.deleted_at),
    status: post.status === null ? undefined : post.status,
    business_status:
      post.business_status === null ? undefined : post.business_status,
  };
}

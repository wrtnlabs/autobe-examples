import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

export async function getRedditCommunityCommunitiesCommunityNamePostsPostId(props: {
  communityName: string;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityPost> {
  const { communityName, postId } = props;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: communityName },
      select: { id: true },
    });

  if (!community) {
    throw new HttpException(`Community '${communityName}' not found`, 404);
  }

  const post = await MyGlobal.prisma.reddit_community_posts.findFirst({
    where: {
      id: postId,
      reddit_community_community_id: community.id,
      deleted_at: null,
    },
  });

  if (!post) {
    throw new HttpException(
      `Post with id '${postId}' not found in community '${communityName}'`,
      404,
    );
  }

  return {
    id: post.id,
    reddit_community_user_id: post.reddit_community_user_id,
    reddit_community_community_id: post.reddit_community_community_id,
    reddit_community_content_type_id: post.reddit_community_content_type_id,
    title: post.title,
    body: post.body,
    image_uri: post.image_uri ?? null,
    status: post.status,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    deleted_at: post.deleted_at ? toISOStringSafe(post.deleted_at) : null,
  };
}

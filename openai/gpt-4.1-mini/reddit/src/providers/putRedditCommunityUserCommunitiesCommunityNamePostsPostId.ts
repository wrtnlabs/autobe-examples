import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putRedditCommunityUserCommunitiesCommunityNamePostsPostId(props: {
  user: UserPayload;
  communityName: string;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPost.IUpdate;
}): Promise<IRedditCommunityPost> {
  const { user, communityName, postId, body } = props;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: communityName },
      select: { id: true },
    });

  if (!community) {
    throw new HttpException(`Community '${communityName}' not found`, 404);
  }

  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: postId },
  });

  if (!post || post.reddit_community_community_id !== community.id) {
    throw new HttpException(
      `Post not found in community '${communityName}'`,
      404,
    );
  }

  if (post.reddit_community_user_id !== user.id) {
    throw new HttpException(`Unauthorized to update this post`, 403);
  }

  const updated = await MyGlobal.prisma.reddit_community_posts.update({
    where: { id: postId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.body !== undefined && { body: body.body }),
      ...(body.image_uri !== undefined && {
        image_uri: body.image_uri ?? null,
      }),
      ...(body.reddit_community_content_type_id !== undefined && {
        reddit_community_content_type_id: body.reddit_community_content_type_id,
      }),
      ...(body.status !== undefined && { status: body.status }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    reddit_community_user_id: updated.reddit_community_user_id,
    reddit_community_community_id: updated.reddit_community_community_id,
    reddit_community_content_type_id: updated.reddit_community_content_type_id,
    title: updated.title,
    body: updated.body,
    image_uri: updated.image_uri ?? null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}

import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putRedditCommunityModeratorCommunitiesCommunityNamePostsPostIdCommentsCommentId(props: {
  moderator: ModeratorPayload;
  communityName: string;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IUpdate;
}): Promise<IRedditCommunityComment> {
  const { moderator, communityName, postId, commentId, body } = props;

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
    select: { reddit_community_community_id: true },
  });

  if (!post || post.reddit_community_community_id !== community.id) {
    throw new HttpException(
      `Post '${postId}' not found in community '${communityName}'`,
      404,
    );
  }

  const moderatorAssignment =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        reddit_community_community_id: community.id,
        reddit_community_moderator_id: moderator.id,
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException(
      "Forbidden: Moderator not assigned to this community",
      403,
    );
  }

  const comment = await MyGlobal.prisma.reddit_community_comments.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      reddit_community_post_id: true,
      parent_id: true,
      reddit_community_user_id: true,
      body: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!comment || comment.reddit_community_post_id !== postId) {
    throw new HttpException(
      `Comment '${commentId}' not found in post '${postId}'`,
      404,
    );
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.reddit_community_comments.update({
    where: { id: commentId },
    data: {
      body: body.body,
      updated_at: now,
    },
    select: {
      id: true,
      reddit_community_post_id: true,
      parent_id: true,
      reddit_community_user_id: true,
      body: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: updated.id,
    reddit_community_post_id: updated.reddit_community_post_id,
    parent_id: updated.parent_id ?? null,
    reddit_community_user_id: updated.reddit_community_user_id,
    body: updated.body,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}

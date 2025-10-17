import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putRedditLikeMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikePost.IUpdate;
}): Promise<IRedditLikePost> {
  const { member, postId, body } = props;

  if (
    body.title === undefined &&
    body.body === undefined &&
    body.caption === undefined
  ) {
    throw new HttpException(
      "At least one field must be provided for update",
      400,
    );
  }

  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: postId },
  });

  if (post.reddit_like_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only edit your own posts",
      403,
    );
  }

  if (post.deleted_at !== null) {
    throw new HttpException("Cannot edit deleted post", 400);
  }

  const nowMillis = Date.now();
  const now = toISOStringSafe(new Date(nowMillis));
  const createdAtMillis = new Date(post.created_at).getTime();
  const timeDifferenceMinutes = (nowMillis - createdAtMillis) / (1000 * 60);

  if (body.title !== undefined && body.title !== null) {
    if (timeDifferenceMinutes > 5) {
      throw new HttpException(
        "Title can only be edited within 5 minutes of creation",
        400,
      );
    }
  }

  if (body.body !== undefined && body.body !== null) {
    if (post.type !== "text") {
      throw new HttpException("Body can only be edited for text posts", 400);
    }

    await MyGlobal.prisma.reddit_like_post_text_content.updateMany({
      where: { reddit_like_post_id: postId },
      data: {
        body: body.body,
        updated_at: now,
      },
    });
  }

  if (body.caption !== undefined && body.caption !== null) {
    if (post.type !== "image") {
      throw new HttpException(
        "Caption can only be edited for image posts",
        400,
      );
    }

    await MyGlobal.prisma.reddit_like_post_image_content.updateMany({
      where: { reddit_like_post_id: postId },
      data: {
        caption: body.caption,
        updated_at: now,
      },
    });
  }

  const updatedPost = await MyGlobal.prisma.reddit_like_posts.update({
    where: { id: postId },
    data: {
      title: body.title ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updatedPost.id,
    type: updatedPost.type,
    title: updatedPost.title,
    created_at: toISOStringSafe(updatedPost.created_at),
    updated_at: toISOStringSafe(updatedPost.updated_at),
  };
}

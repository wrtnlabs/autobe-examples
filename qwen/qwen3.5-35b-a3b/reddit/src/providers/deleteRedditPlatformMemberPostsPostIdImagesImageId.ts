import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditPlatformMemberPostsPostIdImagesImageId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.reddit_platform_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  } satisfies Prisma.reddit_platform_postsFindFirstArgs);
  if (post === null) {
    throw new HttpException("Not found", 404);
  }
  const image = await MyGlobal.prisma.reddit_platform_post_images.findFirst({
    where: {
      id: props.imageId,
      post_id: props.postId,
      deleted_at: null,
    },
  } satisfies Prisma.reddit_platform_post_imagesFindFirstArgs);
  if (image === null) {
    throw new HttpException("Not found", 404);
  }
  const isOwner = post.reddit_platform_member_id === props.member.id;
  const moderator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: post.reddit_platform_community_id,
        user_id: props.member.id,
      },
    } satisfies Prisma.reddit_platform_community_moderatorsFindFirstArgs);
  const isModerator = moderator !== null;
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_platform_post_images.update({
    where: { id: props.imageId },
    data: {
      deleted_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
}

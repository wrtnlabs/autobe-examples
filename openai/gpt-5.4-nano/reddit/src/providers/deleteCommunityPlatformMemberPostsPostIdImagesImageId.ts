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

export async function deleteCommunityPlatformMemberPostsPostIdImagesImageId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: { id: true, author_id: true, community_id: true },
    },
  );
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: post.community_id },
      select: { community_owner_id: true },
    });
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: post.community_id,
        moderator_user_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  const isAuthor = post.author_id === props.member.id;
  const isOwner = community.community_owner_id === props.member.id;
  const isModerator = moderator !== null;
  if (!isAuthor && !isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_post_images.findFirstOrThrow({
      where: {
        id: props.imageId,
        community_platform_post_id: props.postId,
        deleted_at: null,
      },
      select: { id: true },
    });
    await tx.community_platform_post_images.deleteMany({
      where: {
        id: props.imageId,
        community_platform_post_id: props.postId,
        deleted_at: null,
      },
    });
  });
}

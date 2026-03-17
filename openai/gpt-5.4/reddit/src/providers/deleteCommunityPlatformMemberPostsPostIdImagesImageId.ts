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
      select: {
        id: true,
        community_platform_member_id: true,
        community_platform_community_id: true,
        deleted_at: true,
      },
    },
  );
  if (post.deleted_at !== null) {
    throw new HttpException("Post is unavailable", 404);
  }
  const image =
    await MyGlobal.prisma.community_platform_post_images.findUniqueOrThrow({
      where: { id: props.imageId },
      select: {
        id: true,
        community_platform_post_id: true,
        deleted_at: true,
      },
    });
  if (image.deleted_at !== null) {
    throw new HttpException("Image is unavailable", 404);
  }
  if (image.community_platform_post_id !== post.id) {
    throw new HttpException("Image is unavailable", 404);
  }
  if (post.community_platform_member_id !== props.member.id) {
    const moderator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_platform_community_id: post.community_platform_community_id,
          community_platform_member_id: props.member.id,
          status: "active",
          revoked_at: null,
          deleted_at: null,
        },
        select: {
          id: true,
          role: true,
          owner: {
            select: {
              id: true,
            },
          },
        },
      });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
    if (
      moderator.role !== "moderator" &&
      moderator.role !== "owner" &&
      moderator.owner === null
    ) {
      throw new HttpException("Forbidden", 403);
    }
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.community_platform_post_images.update({
      where: { id: props.imageId },
      data: {
        updated_at: new globalThis.Date(),
        deleted_at: new globalThis.Date(),
      },
    });
    await prisma.community_platform_posts.update({
      where: { id: props.postId },
      data: {
        updated_at: new globalThis.Date(),
      },
    });
  });
}

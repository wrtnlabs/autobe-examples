import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformAdminPostsPostIdImagesImageId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    const post = await tx.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: { id: true, author_id: true, community_id: true },
    });
    const [isCommunityOwner, isCommunityModerator] = await Promise.all([
      tx.community_platform_communities.findFirst({
        where: {
          id: post.community_id,
          deleted_at: null,
          community_owner_id: props.admin.id,
        },
        select: { id: true },
      }),
      tx.community_platform_community_moderators.findFirst({
        where: {
          community_id: post.community_id,
          deleted_at: null,
          moderator_user_id: props.admin.id,
        },
        select: { id: true },
      }),
    ]);
    const isPostAuthor = post.author_id === props.admin.id;
    const authorized =
      isPostAuthor ||
      isCommunityOwner !== null ||
      isCommunityModerator !== null;
    if (!authorized) {
      throw new HttpException("Forbidden", 403);
    }
    await tx.community_platform_post_images.findUniqueOrThrow({
      where: {
        community_platform_post_id: props.postId,
        id: props.imageId,
      },
    });
    await tx.community_platform_post_images.delete({
      where: { id: props.imageId },
    });
  });
}

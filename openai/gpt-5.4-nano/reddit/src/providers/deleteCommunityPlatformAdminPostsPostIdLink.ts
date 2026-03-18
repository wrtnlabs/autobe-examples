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

export async function deleteCommunityPlatformAdminPostsPostIdLink(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    const post = await tx.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: {
        id: true,
        author_id: true,
        deleted_at: true,
        post_type: true,
      },
    });
    if (post.deleted_at !== null) {
      throw new HttpException("Post is deleted", 400);
    }
    if (post.post_type !== "link") {
      throw new HttpException("Post is not a link post", 400);
    }
    // Ownership/auth boundary: only the post author is allowed to modify
    if (post.author_id !== props.admin.id) {
      throw new HttpException("Forbidden", 403);
    }
    const link = await tx.community_platform_post_links.findUnique({
      where: { community_platform_post_id: props.postId },
      select: { id: true },
    });
    if (link === null) {
      throw new HttpException(
        "Link metadata not found for the given post",
        400,
      );
    }
    await tx.community_platform_post_links.delete({
      where: { community_platform_post_id: props.postId },
    });
  });
}

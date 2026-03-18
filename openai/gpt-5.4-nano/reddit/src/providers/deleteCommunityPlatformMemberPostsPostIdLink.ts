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

export async function deleteCommunityPlatformMemberPostsPostIdLink(props: {
  member: MemberPayload;
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
    if (post.author_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (post.deleted_at !== null) {
      throw new HttpException("Post is deleted", 400);
    }
    if (post.post_type !== "link") {
      throw new HttpException("Not a link post", 400);
    }
    // Ensure link metadata exists for consistency.
    await tx.community_platform_post_links.findUniqueOrThrow({
      where: { community_platform_post_id: props.postId },
      select: { id: true },
    });
    await tx.community_platform_post_links.delete({
      where: { community_platform_post_id: props.postId },
    });
  });
}

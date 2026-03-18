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

export async function deleteCommunityPlatformAdminPostsPostId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const admin =
    await MyGlobal.prisma.community_platform_admins.findFirstOrThrow({
      where: { id: props.admin.id, deleted_at: null },
      select: { id: true },
    });
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_posts.delete({
      where: { id: props.postId },
    });
    // Derived contexts (feed lists, comment count, vote score) rely on post existence.
    // Cascading FK deletions (configured as onDelete: Cascade in schema) ensure votes/comments/snapshots
    // tied to this post are removed as well.
    void admin;
  });
}

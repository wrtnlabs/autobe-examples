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

export async function deleteRedditLikeMemberCommunitiesCommunityId(props: {
  member: AdminPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the community and verify it exists and is active
  const community =
    await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_id: true,
        icon_attachment_id: true,
      },
    });
  // Verify ownership - only owner can delete
  if (community.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Handle icon attachment cleanup if exists
  if (community.icon_attachment_id !== null) {
    await MyGlobal.prisma.reddit_like_attachments.delete({
      where: { id: community.icon_attachment_id },
    });
  }
  // Soft delete the community
  await MyGlobal.prisma.reddit_like_communities.update({
    where: { id: props.communityId },
    data: {
      deleted_at: new Date(),
    },
  });
}

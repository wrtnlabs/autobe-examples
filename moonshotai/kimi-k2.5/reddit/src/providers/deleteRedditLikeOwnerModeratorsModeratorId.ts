import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeOwnerModeratorsModeratorId(props: {
  owner: OwnerPayload;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the moderator and their community
  const moderator = await MyGlobal.prisma.reddit_like_moderators.findFirst({
    where: {
      id: props.moderatorId,
      deleted_at: null,
    },
    select: {
      id: true,
      member_id: true,
      community_id: true,
      can_add_moderators: true,
      created_at: true,
      updated_at: true,
      community: {
        select: {
          id: true,
          owner_id: true,
        },
      },
    },
  });
  if (moderator === null) {
    throw new HttpException("Moderator not found", 404);
  }
  // Verify the requesting owner owns this community
  if (moderator.community.owner_id !== props.owner.id) {
    throw new HttpException(
      "Forbidden - only community owner can remove moderators",
      403,
    );
  }
  // Soft delete the moderator
  await MyGlobal.prisma.reddit_like_moderators.update({
    where: { id: props.moderatorId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}

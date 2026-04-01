import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeModeratorModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch target moderator with community relation
  const targetModerator =
    await MyGlobal.prisma.reddit_like_moderators.findUnique({
      where: { id: props.moderatorId },
      select: {
        id: true,
        member_id: true,
        deleted_at: true,
        community: {
          select: {
            owner_id: true,
          },
        },
      },
    });
  if (targetModerator === null) {
    throw new HttpException("Moderator not found", 404);
  }
  if (targetModerator.deleted_at !== null) {
    throw new HttpException("Moderator is already removed", 410);
  }
  // Fetch requesting moderator's member_id
  const requestingModerator =
    await MyGlobal.prisma.reddit_like_moderators.findUnique({
      where: { id: props.moderator.id },
      select: {
        member_id: true,
      },
    });
  if (requestingModerator === null) {
    throw new HttpException("Requesting moderator not found", 403);
  }
  // Authorization: owner can remove any moderator, or self-removal allowed
  const isOwner =
    targetModerator.community.owner_id === requestingModerator.member_id;
  const isSelfRemoval =
    targetModerator.member_id === requestingModerator.member_id;
  if (!isOwner && !isSelfRemoval) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete by setting deleted_at
  await MyGlobal.prisma.reddit_like_moderators.update({
    where: { id: props.moderatorId },
    data: {
      deleted_at: new Date(),
    },
  });
}

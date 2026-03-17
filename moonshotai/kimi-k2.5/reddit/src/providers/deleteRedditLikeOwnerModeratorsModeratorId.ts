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
  const moderator =
    await MyGlobal.prisma.reddit_like_moderators.findUniqueOrThrow({
      where: { id: props.moderatorId },
      select: {
        id: true,
        deleted_at: true,
        community: {
          select: {
            owner_id: true,
          },
        } satisfies Prisma.reddit_like_communitiesFindManyArgs,
      },
    });
  if (moderator.deleted_at !== null) {
    throw new HttpException("Moderator not found", 404);
  }
  if (moderator.community.owner_id !== props.owner.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_like_moderators.update({
    where: { id: props.moderatorId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}

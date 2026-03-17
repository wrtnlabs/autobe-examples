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
  const targetModerator =
    await MyGlobal.prisma.reddit_like_moderators.findUniqueOrThrow({
      where: { id: props.moderatorId },
      select: {
        id: true,
        member_id: true,
        community: {
          select: {
            owner_id: true,
          } satisfies Prisma.reddit_like_communitiesSelect,
        },
      } satisfies Prisma.reddit_like_moderatorsSelect,
    });
  const isSelfRemoval = props.moderator.id === targetModerator.member_id;
  const isOwnerRemoval =
    props.moderator.id === targetModerator.community.owner_id;
  if (!isSelfRemoval && !isOwnerRemoval) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_like_moderators.update({
    where: { id: props.moderatorId },
    data: {
      deleted_at: new Date(),
    },
  });
}

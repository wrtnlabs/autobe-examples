import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditLikeModeratorTransformer } from "../transformers/RedditLikeModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeOwnerModeratorsModeratorId(props: {
  owner: OwnerPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: IRedditLikeModerator.IUpdate;
}): Promise<IRedditLikeModerator> {
  // Find moderator and include community to verify ownership
  const moderator =
    await MyGlobal.prisma.reddit_like_moderators.findUniqueOrThrow({
      where: { id: props.moderatorId },
      select: {
        id: true,
        member_id: true,
        community_id: true,
        can_add_moderators: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: {
          select: {
            owner_id: true,
          },
        },
      },
    });
  // Verify moderator role is active (not soft-deleted)
  if (moderator.deleted_at !== null) {
    throw new HttpException("Moderator role has been removed", 404);
  }
  // Verify requester is the community owner
  if (moderator.community.owner_id !== props.owner.id) {
    throw new HttpException(
      "Forbidden: Only community owner can update moderator permissions",
      403,
    );
  }
  // If role is not provided, return current moderator without update
  if (props.body.role === undefined) {
    const current =
      await MyGlobal.prisma.reddit_like_moderators.findUniqueOrThrow({
        where: { id: props.moderatorId },
        ...RedditLikeModeratorTransformer.select(),
      });
    return await RedditLikeModeratorTransformer.transform(current);
  }
  // Map role to can_add_moderators boolean
  const canAddModerators = props.body.role === "admin";
  // Update the moderator record with proper select for transformer
  const updated = await MyGlobal.prisma.reddit_like_moderators.update({
    where: { id: props.moderatorId },
    data: {
      can_add_moderators: canAddModerators,
      updated_at: new Date(),
    },
    ...RedditLikeModeratorTransformer.select(),
  });
  return await RedditLikeModeratorTransformer.transform(updated);
}

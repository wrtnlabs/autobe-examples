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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeModeratorTransformer } from "../transformers/RedditLikeModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeModeratorModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: IRedditLikeModerator.IUpdate;
}): Promise<IRedditLikeModerator> {
  // Fetch requester's member_id from moderator record
  const requesterModerator =
    await MyGlobal.prisma.reddit_like_moderators.findUnique({
      where: { id: props.moderator.id },
      select: { member_id: true },
    });
  if (requesterModerator === null) {
    throw new HttpException("Requester moderator not found", 403);
  }
  const requesterMemberId = requesterModerator.member_id;
  // Fetch target moderator with community for ownership check
  const targetModerator =
    await MyGlobal.prisma.reddit_like_moderators.findFirst({
      where: {
        id: props.moderatorId,
        deleted_at: null,
      },
      select: {
        id: true,
        member_id: true,
        community: {
          select: {
            id: true,
            owner_id: true,
          },
        },
      },
    });
  if (targetModerator === null) {
    throw new HttpException("Moderator not found", 404);
  }
  // Verify requester is the community owner
  if (targetModerator.community.owner_id !== requesterMemberId) {
    throw new HttpException(
      "Only the community owner can update moderator permissions",
      403,
    );
  }
  // Prevent self-modification
  if (targetModerator.member_id === requesterMemberId) {
    throw new HttpException(
      "Cannot modify your own moderator permissions",
      403,
    );
  }
  // Update the moderator record if role is provided
  if (props.body.role !== undefined) {
    // Map role string to can_add_moderators boolean
    const canAddModerators = props.body.role === "senior_moderator";
    await MyGlobal.prisma.reddit_like_moderators.update({
      where: { id: props.moderatorId },
      data: {
        can_add_moderators: canAddModerators,
        updated_at: new Date(),
      },
    });
  }
  // Fetch updated record with full transformation
  const updated =
    await MyGlobal.prisma.reddit_like_moderators.findUniqueOrThrow({
      where: { id: props.moderatorId },
      ...RedditLikeModeratorTransformer.select(),
    });
  return await RedditLikeModeratorTransformer.transform(updated);
}

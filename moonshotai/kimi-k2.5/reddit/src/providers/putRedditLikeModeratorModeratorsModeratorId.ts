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
  // Step 1: Find the moderator record to update
  const targetModerator =
    await MyGlobal.prisma.reddit_like_moderators.findUniqueOrThrow({
      where: {
        id: props.moderatorId,
        deleted_at: null,
      },
      select: {
        id: true,
        community_id: true,
        member_id: true,
      },
    });
  // Step 2: Verify the requesting user is the community owner
  const community =
    await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
      where: { id: targetModerator.community_id },
      select: { owner_id: true },
    });
  if (community.owner_id !== props.moderator.id) {
    throw new HttpException(
      "Only the community owner can update moderator permissions",
      403,
    );
  }
  // Step 3: Prevent self-modification
  if (targetModerator.member_id === props.moderator.id) {
    throw new HttpException(
      "Cannot modify your own moderator permissions",
      403,
    );
  }
  // Step 4: Determine can_add_moderators value from role
  // Role 'admin' or 'moderator_plus' grants add-moderator permission
  const canAddModerators =
    props.body.role !== undefined &&
    (props.body.role === "admin" || props.body.role === "moderator_plus");
  // Step 5: Update the moderator record
  await MyGlobal.prisma.reddit_like_moderators.update({
    where: { id: props.moderatorId },
    data: {
      can_add_moderators: canAddModerators,
      updated_at: new Date().toISOString(),
    },
  });
  // Step 6: Fetch and return the updated record
  const updated =
    await MyGlobal.prisma.reddit_like_moderators.findUniqueOrThrow({
      where: { id: props.moderatorId },
      ...RedditLikeModeratorTransformer.select(),
    });
  return await RedditLikeModeratorTransformer.transform(updated);
}

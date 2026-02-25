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

export async function deleteRedditCloneOwnerCommunitiesCommunityIdModeratorsModeratorId(props: {
  owner: OwnerPayload;
  communityId: string;
  moderatorId: string;
}): Promise<void> {
  // Fetch community to verify ownership
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { owner_id: true },
    });
  // Verify requesting owner is actually the community owner
  if (community.owner_id !== props.owner.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch moderator assignment to verify it exists and get moderator details
  const assignment =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirstOrThrow({
      where: {
        community_id: props.communityId,
        moderator_id: props.moderatorId,
      },
    });
  // Prevent owner from removing themselves (should use community deletion instead)
  if (assignment.moderator_id === community.owner_id) {
    throw new HttpException(
      "Owner cannot remove themselves. Use community deletion instead.",
      400,
    );
  }
  // Delete the moderator assignment
  await MyGlobal.prisma.reddit_clone_community_moderators.delete({
    where: {
      community_id_moderator_id: {
        community_id: props.communityId,
        moderator_id: props.moderatorId,
      },
    },
  });
  // Log the moderation action
  await MyGlobal.prisma.reddit_clone_moderation_logs.create({
    data: {
      id: v4(),
      moderator_id: props.owner.id,
      action_type: "remove_moderator",
      target_type: "moderator",
      created_at: toISOStringSafe(new Date()),
    },
  });
}

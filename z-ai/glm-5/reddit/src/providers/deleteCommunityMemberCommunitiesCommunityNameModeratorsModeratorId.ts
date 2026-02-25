import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityMemberCommunitiesCommunityNameModeratorsModeratorId(props: {
  member: MemberPayload;
  communityName: string;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find community by name and validate ownership
  const community =
    await MyGlobal.prisma.community_communities.findUniqueOrThrow({
      where: { name: props.communityName },
    });
  // Validate the authenticated member is the community owner
  if (community.owner_id !== props.member.id) {
    throw new HttpException(
      "Only the community owner can remove moderators",
      403,
    );
  }
  // 2. Find the moderator record
  const moderator =
    await MyGlobal.prisma.community_moderators.findUniqueOrThrow({
      where: { id: props.moderatorId },
    });
  // Validate moderator belongs to this community
  if (moderator.community_id !== community.id) {
    throw new HttpException("Moderator not found in this community", 404);
  }
  // 3. Validate moderator is not the owner (owner cannot be removed)
  if (moderator.is_owner === true) {
    throw new HttpException("Cannot remove the community owner", 403);
  }
  // 4. Delete the moderator record
  await MyGlobal.prisma.community_moderators.delete({
    where: { id: props.moderatorId },
  });
  // 5. Log the removal action
  const moderationLog = await MyGlobal.prisma.community_moderation_logs.create({
    data: {
      id: v4(),
      community_id: community.id,
      actor_id: props.member.id,
      action_type: "MODERATOR_REMOVED",
      reason: null,
      created_at: new Date(),
    },
  });
  // 6. Create member target record
  await MyGlobal.prisma.community_moderation_log_member_targets.create({
    data: {
      id: v4(),
      community_moderation_log_id: moderationLog.id,
      community_member_id: moderator.member_id,
      created_at: new Date(),
    },
  });
}

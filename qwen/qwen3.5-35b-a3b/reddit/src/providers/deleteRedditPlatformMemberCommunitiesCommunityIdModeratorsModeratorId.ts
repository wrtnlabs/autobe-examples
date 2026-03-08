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

export async function deleteRedditPlatformMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the requesting user is the owner of the community
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
    });
  if (community.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify the moderator exists in this community
  const moderatorRelation =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirstOrThrow(
      {
        where: {
          community_id: props.communityId,
          user_id: props.moderatorId,
        },
      },
    );
  // Verify the moderator is not the community owner
  const moderator =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: { id: props.moderatorId },
    });
  if (moderator.id === community.owner_id) {
    throw new HttpException("Cannot remove community owner", 400);
  }
  // Delete the moderator relationship
  await MyGlobal.prisma.reddit_platform_community_moderators.delete({
    where: { id: moderatorRelation.id },
  });
  // Create audit log entry
  await MyGlobal.prisma.reddit_platform_moderation_audit_logs.create({
    data: {
      id: v4(),
      moderator_id: props.member.id,
      community_id: props.communityId,
      action_type: "remove_moderator",
      action_target_type: "member",
      action_target_id: props.moderatorId,
      action_reason: undefined,
      action_details: undefined,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
}

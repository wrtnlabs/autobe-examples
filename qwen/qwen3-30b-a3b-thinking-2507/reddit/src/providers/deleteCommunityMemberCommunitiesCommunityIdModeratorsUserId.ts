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

export async function deleteCommunityMemberCommunitiesCommunityIdModeratorsUserId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify current user is moderator/owner
  const currentModerator = await MyGlobal.prisma.community_moderators.findFirst(
    {
      where: {
        community_id: props.communityId,
        user_id: props.member.id,
        deleted_at: null,
      },
    },
  );
  if (!currentModerator) {
    throw new HttpException(
      "You are not a moderator or owner of this community",
      403,
    );
  }
  // Check if target is community owner
  const targetIsOwner = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: props.communityId,
      user_id: props.userId,
      is_owner: true,
      deleted_at: null,
    },
  });
  if (targetIsOwner) {
    throw new HttpException("Cannot remove community owner", 403);
  }
  // Verify target user is a moderator
  const targetModerator = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: props.communityId,
      user_id: props.userId,
      is_owner: false,
      deleted_at: null,
    },
  });
  if (!targetModerator) {
    throw new HttpException("User is not a community moderator", 404);
  }
  // Soft delete the relationship using primary key
  await MyGlobal.prisma.community_moderators.update({
    where: {
      id: targetModerator.id,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // Log audit action using correct model name
  await MyGlobal.prisma.communityModeratorAudit.create({
    data: {
      community_id: props.communityId,
      user_id: props.member.id,
      target_user_id: props.userId,
      action: "remove",
      created_at: toISOStringSafe(new Date()),
    },
  });
}

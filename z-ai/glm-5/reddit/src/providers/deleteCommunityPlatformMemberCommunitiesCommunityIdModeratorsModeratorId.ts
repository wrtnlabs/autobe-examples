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

export async function deleteCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify the requester is a moderator in this community
  const requesterModerator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        role: true,
      },
    });
  if (requesterModerator === null) {
    throw new HttpException("You are not a moderator of this community", 403);
  }
  // 2. Verify the target moderator record exists and belongs to the community
  const targetModerator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        id: props.moderatorId,
        community_platform_community_id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        role: true,
      },
    });
  if (targetModerator === null) {
    throw new HttpException("Moderator record not found", 404);
  }
  // 3. Cannot remove the community owner
  if (targetModerator.role === "owner") {
    throw new HttpException("Cannot remove the community owner", 403);
  }
  // 4. Only the owner can remove moderators
  if (requesterModerator.role !== "owner") {
    throw new HttpException(
      "Only the community owner can remove moderators",
      403,
    );
  }
  // 5. Soft-delete the moderator record
  await MyGlobal.prisma.community_platform_moderators.update({
    where: { id: props.moderatorId },
    data: { deleted_at: new Date() },
  });
}

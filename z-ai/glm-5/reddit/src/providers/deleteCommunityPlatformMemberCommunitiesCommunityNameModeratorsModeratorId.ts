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

export async function deleteCommunityPlatformMemberCommunitiesCommunityNameModeratorsModeratorId(props: {
  member: MemberPayload;
  communityName: string;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find community by name (case-sensitive lookup - Prisma handles exact match)
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });
  // Verify the requesting member is the community owner
  // Per [170]: Only the community owner can remove moderators
  // Per [183]: Moderators cannot remove other moderators
  if (community.owner_id !== props.member.id) {
    throw new HttpException(
      "Only the community owner can remove moderators",
      403,
    );
  }
  // Find the moderator record
  const moderatorRecord =
    await MyGlobal.prisma.community_platform_community_moderators.findUniqueOrThrow(
      {
        where: {
          id: props.moderatorId,
        },
      },
    );
  // Verify moderator record belongs to this community
  if (moderatorRecord.community_id !== community.id) {
    throw new HttpException("Moderator not found in this community", 404);
  }
  // Verify not already deleted
  if (moderatorRecord.deleted_at !== null) {
    throw new HttpException("Moderator already removed", 400);
  }
  // Soft delete the moderator record by setting deleted_at timestamp
  // Per [170]: Preserve all content and actions the removed moderator created
  // Per [170]: Allow the removed moderator to remain a regular member
  await MyGlobal.prisma.community_platform_community_moderators.update({
    where: {
      id: props.moderatorId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}

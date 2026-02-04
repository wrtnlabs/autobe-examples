import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteCommunityPlatformModeratorModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Retrieve the actual moderator record that links the member to a community
  const moderationRecord =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member: { id: props.moderatorId }, // Use relation field 'member', not foreign key 'member_id'
        deleted_at: null,
      },
    });
  // 2. If record not found, return 404
  if (!moderationRecord) {
    throw new HttpException("Moderator not found in any community", 404);
  }
  // 3. Verify that the calling moderator is the OWNER of this community
  // Fetch the community's owner, using the community from the moderation record
  const owner = await MyGlobal.prisma.community_platform_owners.findFirst({
    where: {
      id: moderationRecord.community.id, // Use relation field 'community' to access id
      deleted_at: null,
    },
  });
  // 4. Compare owner's id with the calling moderator’s member id
  // Requirement: ''Authorization must verify the caller is the community owner''
  if (owner?.id !== props.moderator.id) {
    throw new HttpException("Forbidden - You are not the community owner", 403);
  }
  // 5. Delete the moderator assignment (not the user)
  await MyGlobal.prisma.community_platform_moderators.delete({
    where: {
      member: { id: props.moderatorId }, // Use relation field 'member'
      community: { id: moderationRecord.community.id }, // Use relation field 'community'
      deleted_at: null,
    },
  });
}

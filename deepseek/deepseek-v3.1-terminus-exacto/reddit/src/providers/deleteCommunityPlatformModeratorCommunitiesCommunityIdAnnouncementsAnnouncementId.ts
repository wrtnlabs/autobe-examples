import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformModeratorCommunitiesCommunityIdAnnouncementsAnnouncementId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  announcementId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Use transaction for data integrity
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Verify moderator has active assignment to the community
    const moderatorAssignment =
      await tx.community_platform_community_moderators.findFirst({
        where: {
          user_id: props.moderator.id,
          community_id: props.communityId,
          is_active: true,
          deleted_at: null,
        },
      });
    if (!moderatorAssignment) {
      throw new HttpException(
        "You do not have moderator permissions for this community",
        403,
      );
    }
    // Verify announcement exists and belongs to the specified community
    const announcement =
      await tx.community_platform_community_announcements.findUniqueOrThrow({
        where: {
          id: props.announcementId,
          community_platform_community_id: props.communityId,
        },
      });
    // Perform hard deletion
    await tx.community_platform_community_announcements.delete({
      where: {
        id: props.announcementId,
      },
    });
    // Log moderation action for audit purposes (as required by security specifications)
    await tx.community_platform_moderation_action_logs.create({
      data: {
        id: v4(),
        moderator_id: props.moderator.id,
        community_id: props.communityId,
        action_type: "announcement_deletion",
        action_description: `Deleted announcement: ${announcement.title}`,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  });
}

import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityAnnouncement";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommunityAnnouncementTransformer } from "../transformers/CommunityPlatformCommunityAnnouncementTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformModeratorCommunitiesCommunityIdAnnouncementsAnnouncementId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  announcementId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityAnnouncement.IUpdate;
}): Promise<ICommunityPlatformCommunityAnnouncement> {
  // Verify moderator has permissions for this community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.moderator.id,
      },
    });
  if (!moderatorAssignment) {
    throw new HttpException(
      "Moderator does not have permissions for this community",
      403,
    );
  }
  // Verify announcement exists and belongs to the specified community
  const announcement =
    await MyGlobal.prisma.community_platform_community_announcements.findUnique(
      {
        where: { id: props.announcementId },
        select: { community_platform_community_id: true },
      },
    );
  if (!announcement) {
    throw new HttpException("Announcement not found", 404);
  }
  if (announcement.community_platform_community_id !== props.communityId) {
    throw new HttpException(
      "Announcement does not belong to the specified community",
      400,
    );
  }
  // Build update data with proper Prisma typing
  const updateData: Prisma.community_platform_community_announcementsUpdateInput =
    {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.content !== undefined && { content: props.body.content }),
      ...(props.body.is_pinned !== undefined && {
        is_pinned: props.body.is_pinned,
        pinned_at: props.body.is_pinned ? new Date() : null,
      }),
      ...(props.body.status !== undefined &&
        props.body.status !== null && {
          status: props.body.status,
        }),
      updated_at: new Date(),
    };
  // Perform the update and fetch the updated announcement in one operation
  const updatedAnnouncement =
    await MyGlobal.prisma.community_platform_community_announcements.update({
      where: { id: props.announcementId },
      data: updateData,
      ...CommunityPlatformCommunityAnnouncementTransformer.select(),
    });
  return await CommunityPlatformCommunityAnnouncementTransformer.transform(
    updatedAnnouncement,
  );
}

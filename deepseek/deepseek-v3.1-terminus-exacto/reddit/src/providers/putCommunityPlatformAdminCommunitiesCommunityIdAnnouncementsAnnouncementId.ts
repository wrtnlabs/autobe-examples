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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityAnnouncementTransformer } from "../transformers/CommunityPlatformCommunityAnnouncementTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putCommunityPlatformAdminCommunitiesCommunityIdAnnouncementsAnnouncementId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  announcementId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityAnnouncement.IUpdate;
}): Promise<ICommunityPlatformCommunityAnnouncement> {
  // Verify announcement exists and belongs to the specified community
  const existingAnnouncement =
    await MyGlobal.prisma.community_platform_community_announcements.findUnique(
      {
        where: {
          id: props.announcementId,
          community_platform_community_id: props.communityId,
        },
      },
    );
  if (!existingAnnouncement) {
    throw new HttpException(
      "Announcement not found in the specified community",
      404,
    );
  }
  // Build update data with type safety
  const updateData: Prisma.community_platform_community_announcementsUpdateInput =
    {
      updated_at: new Date(),
    };
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.content !== undefined) {
    updateData.content = props.body.content;
  }
  if (props.body.is_pinned !== undefined) {
    updateData.is_pinned = props.body.is_pinned;
    updateData.pinned_at = props.body.is_pinned ? new Date() : null;
  }
  if (props.body.status !== undefined) {
    // Handle null status by setting it to undefined (no update) instead of null
    updateData.status =
      props.body.status !== null ? props.body.status : undefined;
  }
  // Check if any fields are actually being updated
  const hasUpdates = Object.keys(updateData).length > 1; // More than just updated_at
  if (!hasUpdates) {
    throw new HttpException("No valid fields provided for update", 400);
  }
  // Perform update and return updated data in single operation
  const updatedAnnouncement =
    await MyGlobal.prisma.community_platform_community_announcements.update({
      where: {
        id: props.announcementId,
      },
      data: updateData,
      ...CommunityPlatformCommunityAnnouncementTransformer.select(),
    });
  return await CommunityPlatformCommunityAnnouncementTransformer.transform(
    updatedAnnouncement,
  );
}

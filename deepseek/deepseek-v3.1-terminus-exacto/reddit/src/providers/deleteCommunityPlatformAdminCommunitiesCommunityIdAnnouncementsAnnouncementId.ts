import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformAdminCommunitiesCommunityIdAnnouncementsAnnouncementId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  announcementId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the announcement exists and belongs to the specified community
  const announcement =
    await MyGlobal.prisma.community_platform_community_announcements.findUniqueOrThrow(
      {
        where: {
          id: props.announcementId,
          community_platform_community_id: props.communityId,
        },
      },
    );
  // Delete the announcement (hard delete since no deleted_at field)
  await MyGlobal.prisma.community_platform_community_announcements.delete({
    where: { id: props.announcementId },
  });
}

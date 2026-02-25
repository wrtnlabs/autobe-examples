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
import { CommunityPlatformCommunityAnnouncementTransformer } from "../transformers/CommunityPlatformCommunityAnnouncementTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformCommunitiesCommunityIdAnnouncementsAnnouncementId(props: {
  communityId: string & tags.Format<"uuid">;
  announcementId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityAnnouncement> {
  const announcement =
    await MyGlobal.prisma.community_platform_community_announcements.findUniqueOrThrow(
      {
        where: {
          id: props.announcementId,
          community_platform_community_id: props.communityId,
        },
        ...CommunityPlatformCommunityAnnouncementTransformer.select(),
      },
    );
  return await CommunityPlatformCommunityAnnouncementTransformer.transform(
    announcement,
  );
}

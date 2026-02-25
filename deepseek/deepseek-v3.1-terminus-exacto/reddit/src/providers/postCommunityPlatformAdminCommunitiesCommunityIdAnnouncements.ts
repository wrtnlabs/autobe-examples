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
import { CommunityPlatformCommunityAnnouncementCollector } from "../collectors/CommunityPlatformCommunityAnnouncementCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityAnnouncementTransformer } from "../transformers/CommunityPlatformCommunityAnnouncementTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminCommunitiesCommunityIdAnnouncements(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityAnnouncement.ICreate;
}): Promise<ICommunityPlatformCommunityAnnouncement> {
  // Verify community exists
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Verify admin exists and is active
  const admin = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: {
      id: props.admin.id,
      deleted_at: null,
      is_active: true,
    },
  });
  if (!admin) {
    throw new HttpException("Forbidden", 403);
  }
  // Create announcement using collector
  const created =
    await MyGlobal.prisma.community_platform_community_announcements.create({
      data: await CommunityPlatformCommunityAnnouncementCollector.collect({
        body: props.body,
        communityPlatformCommunities: {
          id: props.communityId,
        } satisfies IEntity,
        communityPlatformUsers: { id: props.admin.id } satisfies IEntity,
        communityPlatformUserSessions: {
          id: props.admin.session_id,
        } satisfies IEntity,
      }),
      ...CommunityPlatformCommunityAnnouncementTransformer.select(),
    });
  // Transform to response DTO
  return await CommunityPlatformCommunityAnnouncementTransformer.transform(
    created,
  );
}

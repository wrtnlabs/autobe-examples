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

export async function deleteCommunityPlatformAdminCommunitiesCommunityIdWikisWikiId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  wikiId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify community exists and admin has authorization
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId, deleted_at: null },
    });
  // Check if admin is community owner or moderator
  const isOwner = community.owner_user_id === props.admin.id;
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.admin.id,
        is_active: true,
        deleted_at: null,
      },
    });
  if (!isOwner && !moderatorAssignment) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify wiki page exists and belongs to the community
  const wiki =
    await MyGlobal.prisma.community_platform_community_wikis.findUniqueOrThrow({
      where: {
        id: props.wikiId,
        community_platform_community_id: props.communityId,
        deleted_at: null,
      },
    });
  // Delete the wiki page (cascade deletion handled by database)
  await MyGlobal.prisma.community_platform_community_wikis.delete({
    where: { id: props.wikiId },
  });
}

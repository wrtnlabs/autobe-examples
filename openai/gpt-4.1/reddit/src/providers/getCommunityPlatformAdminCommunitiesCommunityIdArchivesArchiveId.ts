import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityArchive";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminCommunitiesCommunityIdArchivesArchiveId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  archiveId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityArchive> {
  const archive =
    await MyGlobal.prisma.community_platform_community_archives.findFirst({
      where: {
        id: props.archiveId,
        community_platform_community_id: props.communityId,
      },
    });
  if (!archive) {
    throw new HttpException("Archived community record not found", 404);
  }
  return {
    id: archive.id,
    community_platform_community_id: archive.community_platform_community_id,
    archived_by_user_id: archive.archived_by_user_id,
    archived_name: archive.archived_name,
    archived_description: archive.archived_description,
    archived_at: toISOStringSafe(archive.archived_at),
  };
}

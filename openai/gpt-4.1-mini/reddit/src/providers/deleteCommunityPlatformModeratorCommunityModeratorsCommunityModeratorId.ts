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

export async function deleteCommunityPlatformModeratorCommunityModeratorsCommunityModeratorId(props: {
  moderator: ModeratorPayload;
  communityModeratorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const link =
    await MyGlobal.prisma.community_platform_community_moderators.findUnique({
      where: { id: props.communityModeratorId },
      select: { id: true, community_id: true },
    });
  if (!link) throw new HttpException("CommunityModerator link not found", 404);
  const communityModerators =
    await MyGlobal.prisma.community_platform_community_moderators.findMany({
      where: { community_id: link.community_id, deleted_at: null },
      select: { community_moderator_id: true, role: true },
    });
  const communityOwner = communityModerators.find(
    (moderator) =>
      moderator.community_moderator_id === props.moderator.id &&
      moderator.role === "owner",
  );
  if (!communityOwner) throw new HttpException("Forbidden", 403);
  await MyGlobal.prisma.community_platform_community_moderators.delete({
    where: { id: props.communityModeratorId },
  });
}

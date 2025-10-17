import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminCommunitiesCommunityIdCommunityModeratorsModeratorId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, communityId, moderatorId } = props;

  const existing =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        member_id: moderatorId,
        community_id: communityId,
      },
    });

  if (!existing) {
    throw new HttpException("Community moderator assignment not found", 404);
  }

  await MyGlobal.prisma.reddit_community_community_moderators.delete({
    where: { id: existing.id },
  });
}

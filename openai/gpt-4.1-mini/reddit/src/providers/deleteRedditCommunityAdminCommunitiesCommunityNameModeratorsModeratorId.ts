import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminCommunitiesCommunityNameModeratorsModeratorId(props: {
  admin: AdminPayload;
  communityName: string;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, communityName, moderatorId } = props;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: communityName },
      select: { id: true },
    });

  if (!community) {
    throw new HttpException(
      `Community with name '${communityName}' not found`,
      404,
    );
  }

  const moderatorAssignment =
    await MyGlobal.prisma.reddit_community_community_moderators.findUnique({
      where: {
        reddit_community_community_id_reddit_community_moderator_id: {
          reddit_community_community_id: community.id,
          reddit_community_moderator_id: moderatorId,
        },
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException(
      `Moderator assignment not found for moderator ID '${moderatorId}' in community '${communityName}'`,
      404,
    );
  }

  await MyGlobal.prisma.reddit_community_community_moderators.delete({
    where: { id: moderatorAssignment.id },
  });
}

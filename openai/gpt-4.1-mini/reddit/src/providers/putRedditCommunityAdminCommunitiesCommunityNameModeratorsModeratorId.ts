import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putRedditCommunityAdminCommunitiesCommunityNameModeratorsModeratorId(props: {
  admin: AdminPayload;
  communityName: string;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, communityName, moderatorId } = props;
  // Verify community exists by unique name
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: communityName },
      select: { id: true },
    });

  if (!community) {
    throw new HttpException(
      `Community not found by name: ${communityName}`,
      404,
    );
  }

  // Verify moderator exists by id
  const moderator = await MyGlobal.prisma.reddit_community_moderator.findUnique(
    {
      where: { id: moderatorId },
      select: { id: true },
    },
  );

  if (!moderator) {
    throw new HttpException(`Moderator not found by id: ${moderatorId}`, 404);
  }

  // Verify existing assignment record
  const assignment =
    await MyGlobal.prisma.reddit_community_community_moderators.findUnique({
      where: {
        reddit_community_community_id_reddit_community_moderator_id: {
          reddit_community_community_id: community.id,
          reddit_community_moderator_id: moderatorId,
        },
      },
      select: { id: true },
    });

  if (!assignment) {
    throw new HttpException(
      `Moderator assignment not found for community ${communityName} and moderator ${moderatorId}`,
      404,
    );
  }

  // Update assignment's assigned_at to current timestamp
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.reddit_community_community_moderators.update({
    where: { id: assignment.id },
    data: { assigned_at: now },
  });
}

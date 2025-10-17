import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function deleteRedditCommunityCommunityModeratorCommunitiesCommunityIdCommunityModeratorsModeratorId(props: {
  communityModerator: CommunitymoderatorPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { communityModerator, communityId, moderatorId } = props;

  // Check if the requesting user is assigned as moderator in the community
  const requestingModerator =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        member_id: communityModerator.id,
        community_id: communityId,
      },
    });

  if (!requestingModerator) {
    throw new HttpException(
      "Unauthorized: You must be a community moderator of the target community",
      403,
    );
  }

  // Find the target moderator assignment record to delete
  const targetModerator =
    await MyGlobal.prisma.reddit_community_community_moderators.findUniqueOrThrow(
      {
        where: {
          member_id_community_id: {
            member_id: moderatorId,
            community_id: communityId,
          },
        },
      },
    );

  // Delete the target moderator assignment
  await MyGlobal.prisma.reddit_community_community_moderators.delete({
    where: {
      member_id_community_id: {
        member_id: moderatorId,
        community_id: communityId,
      },
    },
  });
}

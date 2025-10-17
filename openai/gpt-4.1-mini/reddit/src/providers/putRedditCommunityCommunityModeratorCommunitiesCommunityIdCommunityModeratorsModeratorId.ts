import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerators";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function putRedditCommunityCommunityModeratorCommunitiesCommunityIdCommunityModeratorsModeratorId(props: {
  communityModerator: CommunitymoderatorPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommunityModerators.IUpdate;
}): Promise<IRedditCommunityCommunityModerators> {
  const { communityModerator, communityId, moderatorId, body } = props;

  const existingModerator =
    await MyGlobal.prisma.reddit_community_community_moderators.findUnique({
      where: { id: moderatorId },
    });

  if (!existingModerator || existingModerator.community_id !== communityId) {
    throw new HttpException("Community moderator not found", 404);
  }

  const updated =
    await MyGlobal.prisma.reddit_community_community_moderators.update({
      where: { id: moderatorId },
      data: {
        assigned_at: body.assigned_at ?? undefined,
        created_at: body.created_at ?? undefined,
        updated_at: body.updated_at ?? undefined,
        member_id: body.member_id,
        community_id: body.community_id,
      },
    });

  return {
    id: updated.id,
    member_id: updated.member_id,
    community_id: updated.community_id,
    assigned_at: toISOStringSafe(updated.assigned_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}

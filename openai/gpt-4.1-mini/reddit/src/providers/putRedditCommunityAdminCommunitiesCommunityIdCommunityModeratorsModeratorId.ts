import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerators";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putRedditCommunityAdminCommunitiesCommunityIdCommunityModeratorsModeratorId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommunityModerators.IUpdate;
}): Promise<IRedditCommunityCommunityModerators> {
  const { admin, communityId, moderatorId, body } = props;

  const existingModerator =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        id: moderatorId,
        community_id: communityId,
      },
    });

  if (!existingModerator) {
    throw new HttpException("Moderator not found", 404);
  }

  const data: Partial<{
    assigned_at: string & tags.Format<"date-time">;
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
  }> = {};

  if (body.assigned_at !== undefined) {
    data.assigned_at = body.assigned_at;
  }
  if (body.created_at !== undefined) {
    data.created_at = body.created_at;
  }
  if (body.updated_at !== undefined) {
    data.updated_at = body.updated_at;
  }

  const updatedModerator =
    await MyGlobal.prisma.reddit_community_community_moderators.update({
      where: { id: moderatorId },
      data,
    });

  return {
    id: updatedModerator.id,
    member_id: updatedModerator.member_id,
    community_id: updatedModerator.community_id,
    assigned_at: toISOStringSafe(updatedModerator.assigned_at),
    created_at: toISOStringSafe(updatedModerator.created_at),
    updated_at: toISOStringSafe(updatedModerator.updated_at),
  };
}

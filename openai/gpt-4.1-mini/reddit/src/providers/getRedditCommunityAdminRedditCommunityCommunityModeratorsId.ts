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

export async function getRedditCommunityAdminRedditCommunityCommunityModeratorsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommunityModerators> {
  const moderator =
    await MyGlobal.prisma.reddit_community_community_moderators.findUniqueOrThrow(
      {
        where: { id: props.id },
      },
    );

  return {
    id: moderator.id,
    member_id: moderator.member_id,
    community_id: moderator.community_id,
    assigned_at: toISOStringSafe(moderator.assigned_at),
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
  };
}

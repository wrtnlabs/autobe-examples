import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditCommunityAdminModeratorsModeratorId(props: {
  admin: AdminPayload;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityModerator> {
  const { admin, moderatorId } = props;

  const moderator =
    await MyGlobal.prisma.reddit_community_moderator.findUniqueOrThrow({
      where: { id: moderatorId },
    });

  return {
    id: moderator.id,
    user_id: moderator.user_id,
    created_at: toISOStringSafe(moderator.created_at),
  };
}

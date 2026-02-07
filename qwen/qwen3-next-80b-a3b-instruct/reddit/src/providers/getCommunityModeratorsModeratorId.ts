import { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityModeratorsModeratorId(props: {
  moderatorId: string & tags.Format<"uuid">;
}): Promise<ICommunityModerator> {
  const moderator = await MyGlobal.prisma.community_moderators.findUnique({
    where: { id: props.moderatorId },
  });
  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }
  if (moderator.deleted_at !== null) {
    throw new HttpException("Moderator not found", 404);
  }
  return {
    id: moderator.id as string & tags.Format<"uuid">,
    email: moderator.email as string,
    display_name: moderator.display_name as string | null,
    bio: moderator.bio as string | null,
    avatar_url: moderator.avatar_url as string | null,
    created_at: toISOStringSafe(moderator.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(moderator.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: moderator.deleted_at
      ? (toISOStringSafe(moderator.deleted_at) as string &
          tags.Format<"date-time">)
      : null,
  };
}

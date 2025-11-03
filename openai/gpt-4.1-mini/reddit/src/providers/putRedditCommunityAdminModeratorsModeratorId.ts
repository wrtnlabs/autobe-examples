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

export async function putRedditCommunityAdminModeratorsModeratorId(props: {
  admin: AdminPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: IRedditCommunityModerator.IUpdate;
}): Promise<IRedditCommunityModerator> {
  const { admin, moderatorId, body } = props;

  // Authorization is validated at decorator level - proceed directly
  // Check existence of moderator
  const moderator =
    await MyGlobal.prisma.reddit_community_moderator.findUniqueOrThrow({
      where: { id: moderatorId },
    });

  const updated = await MyGlobal.prisma.reddit_community_moderator.update({
    where: { id: moderatorId },
    data: {
      user_id: body.user_id ?? undefined,
    },
  });

  return {
    id: updated.id,
    user_id: updated.user_id,
    created_at: toISOStringSafe(updated.created_at),
  };
}

import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityModerator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";

export async function getRedditLikeCommunitiesCommunityIdModerators(props: {
  communityId: string & tags.Format<"uuid">;
}): Promise<IPageIRedditLikeCommunityModerator> {
  const { communityId } = props;

  await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
    where: { id: communityId },
  });

  const moderators =
    await MyGlobal.prisma.reddit_like_community_moderators.findMany({
      where: {
        community_id: communityId,
      },
      orderBy: [{ is_primary: "desc" }, { assigned_at: "asc" }],
    });

  const data: IRedditLikeCommunityModerator[] = moderators.map((mod) => ({
    id: mod.id,
    community_id: mod.community_id,
    moderator_id: mod.moderator_id,
    assigned_at: toISOStringSafe(mod.assigned_at),
    is_primary: mod.is_primary,
    permissions: mod.permissions,
  }));

  const total = moderators.length;
  const pagination: IPage.IPagination = {
    current: Number(0),
    limit: Number(total > 0 ? total : 10),
    records: Number(total),
    pages: Number(total > 0 ? 1 : 0),
  };

  return {
    pagination,
    data,
  };
}

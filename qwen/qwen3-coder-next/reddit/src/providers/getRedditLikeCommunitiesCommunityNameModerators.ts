import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeModeratorRoleAtSummaryTransformer } from "../transformers/RedditLikeModeratorRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeCommunitiesCommunityNameModerators(props: {
  communityName: string;
}): Promise<IRedditLikeModeratorRole.ISummary[]> {
  // Find the community first
  const community = await MyGlobal.prisma.reddit_like_communities.findUnique({
    where: { name: props.communityName },
    select: { id: true },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // TODO: Add authorization check - need auth context in props
  const moderators = await MyGlobal.prisma.reddit_like_moderator_roles.findMany(
    {
      where: { community_id: community.id },
      ...RedditLikeModeratorRoleAtSummaryTransformer.select(),
      orderBy: [
        { role: "desc" }, // owner first
        { created_at: "desc" },
      ],
    },
  );
  return await Promise.all(
    moderators.map(RedditLikeModeratorRoleAtSummaryTransformer.transform),
  );
}

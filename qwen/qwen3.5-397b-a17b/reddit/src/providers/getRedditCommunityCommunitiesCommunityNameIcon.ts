import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommunityIconAtSummaryTransformer } from "../transformers/RedditCommunityCommunityIconAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityCommunitiesCommunityNameIcon(props: {
  communityName: string;
}): Promise<IRedditCommunityCommunityIcon.ISummary | null> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirst({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  const icon = await MyGlobal.prisma.reddit_community_community_icons.findFirst(
    {
      where: {
        reddit_community_community_id: community.id,
        deleted_at: null,
      },
      ...RedditCommunityCommunityIconAtSummaryTransformer.select(),
    },
  );
  if (!icon) {
    return null;
  }
  return await RedditCommunityCommunityIconAtSummaryTransformer.transform(icon);
}

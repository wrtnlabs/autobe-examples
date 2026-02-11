import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommunityTransformer } from "../transformers/RedditCommunityCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityCommunitiesId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommunity> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: props.id },
      ...RedditCommunityCommunityTransformer.select(),
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  return await RedditCommunityCommunityTransformer.transform(community);
}

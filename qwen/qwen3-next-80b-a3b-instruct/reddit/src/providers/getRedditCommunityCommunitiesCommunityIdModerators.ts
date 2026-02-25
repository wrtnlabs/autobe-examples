import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityModeratorTransformer } from "../transformers/RedditCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityCommunitiesCommunityIdModerators(props: {
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityModerator> {
  const moderators = await MyGlobal.prisma.reddit_community_moderators.findMany(
    {
      where: { community_id: props.communityId },
      orderBy: { created_at: "asc" },
      ...RedditCommunityModeratorTransformer.select(),
    },
  );
  if (moderators.length === 0) {
    throw new HttpException("No moderators found for this community", 404);
  }
  return await RedditCommunityModeratorTransformer.transform(moderators[0]);
}

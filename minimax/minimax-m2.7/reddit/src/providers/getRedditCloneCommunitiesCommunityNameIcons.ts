import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommunityIconTransformer } from "../transformers/RedditCloneCommunityIconTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneCommunitiesCommunityNameIcons(props: {
  communityName: string;
}): Promise<IRedditCloneCommunityIcon | null> {
  // Find the community by name (case-insensitive lookup)
  const community = await MyGlobal.prisma.reddit_clone_communities.findFirst({
    where: { name: props.communityName },
    select: { id: true },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Find the community icon (may not exist)
  const icon = await MyGlobal.prisma.reddit_clone_community_icons.findFirst({
    where: { reddit_clone_community_id: community.id },
    ...RedditCloneCommunityIconTransformer.select(),
  });
  if (!icon) {
    return null;
  }
  return await RedditCloneCommunityIconTransformer.transform(icon);
}

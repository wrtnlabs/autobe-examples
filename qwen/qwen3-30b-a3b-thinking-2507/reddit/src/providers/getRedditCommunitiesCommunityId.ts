import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityTransformer } from "../transformers/RedditCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunitiesCommunityId(props: {
  communityId: string;
}): Promise<IRedditCommunity> {
  const community = await MyGlobal.prisma.reddit_communities.findUniqueOrThrow({
    where: { id: props.communityId },
    ...RedditCommunityTransformer.select(),
  });
  return await RedditCommunityTransformer.transform(community);
}

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
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

export async function getRedditCommunityCommunitiesCommunityId(props: {
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommunity> {
  const record =
    await MyGlobal.prisma.reddit_community_communities.findFirstOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      ...RedditCommunityCommunityTransformer.select(),
    });
  return await RedditCommunityCommunityTransformer.transform(record);
}

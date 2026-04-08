import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommunityTransformer } from "../transformers/RedditCloneCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneCommunitiesCommunityId(props: {
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneCommunity> {
  const record =
    await MyGlobal.prisma.reddit_clone_communities.findFirstOrThrow({
      ...RedditCloneCommunityTransformer.select(),
      where: {
        id: props.communityId,
        deleted_at: null,
      },
    });
  return await RedditCloneCommunityTransformer.transform(record);
}

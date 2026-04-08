import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditCloneCommunityModeratorTransformer } from "../transformers/RedditCloneCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneModeratorCommunitiesCommunityIdModeratorsModeratorId(props: {
  moderator: {
    id: string;
    session_id: string;
    type: "moderator";
  };
  communityId: string;
  moderatorId: string;
}): Promise<IRedditCloneCommunityModerator> {
  const record =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirstOrThrow({
      where: {
        id: props.moderatorId,
        reddit_clone_community_id: props.communityId,
        deleted_at: null,
      },
      ...RedditCloneCommunityModeratorTransformer.select(),
    });
  return await RedditCloneCommunityModeratorTransformer.transform(record);
}

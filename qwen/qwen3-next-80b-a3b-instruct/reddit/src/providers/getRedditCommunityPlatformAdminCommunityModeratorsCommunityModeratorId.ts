import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { RedditCommunityCommunityModeratorTransformer } from "../transformers/RedditCommunityCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityPlatformAdminCommunityModeratorsCommunityModeratorId(props: {
  platformAdmin: PlatformadminPayload;
  communityModeratorId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommunityModerator> {
  const moderator =
    await MyGlobal.prisma.reddit_community_community_moderators.findUniqueOrThrow(
      {
        where: { id: props.communityModeratorId, is_deleted: false },
        ...RedditCommunityCommunityModeratorTransformer.select(),
      },
    );
  return await RedditCommunityCommunityModeratorTransformer.transform(
    moderator,
  );
}

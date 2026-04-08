import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditCloneCommunityBanTransformer } from "../transformers/RedditCloneCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneModeratorCommunitiesCommunityIdBansBanId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneCommunityBan> {
  // Verify the moderator has access to this community
  const moderatorAccess =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        id: props.moderator.id,
        community: { id: props.communityId },
        deleted_at: null,
      },
    });
  if (moderatorAccess === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Query the ban record with community scoping and active status
  const record =
    await MyGlobal.prisma.reddit_clone_community_bans.findFirstOrThrow({
      ...RedditCloneCommunityBanTransformer.select(),
      where: {
        id: props.banId,
        community: { id: props.communityId },
        deleted_at: null,
      },
    });
  return await RedditCloneCommunityBanTransformer.transform(record);
}

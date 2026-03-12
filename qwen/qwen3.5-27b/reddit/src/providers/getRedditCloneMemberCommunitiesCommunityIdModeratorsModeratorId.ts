import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityModeratorTransformer } from "../transformers/RedditCloneCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
  member: MemberPayload;
  communityId: string;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneCommunityModerator> {
  const moderator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findUniqueOrThrow({
      where: {
        reddit_clone_communities_id_reddit_clone_members_id: {
          reddit_clone_communities_id: props.communityId,
          reddit_clone_members_id: props.moderatorId,
        },
        deleted_at: null,
      },
      ...RedditCloneCommunityModeratorTransformer.select(),
    });
  return await RedditCloneCommunityModeratorTransformer.transform(moderator);
}

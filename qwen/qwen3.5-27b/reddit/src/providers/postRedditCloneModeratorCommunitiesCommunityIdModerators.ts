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
import { RedditCloneCommunityModeratorCollector } from "../collectors/RedditCloneCommunityModeratorCollector";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditCloneCommunityModeratorTransformer } from "../transformers/RedditCloneCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneModeratorCommunitiesCommunityIdModerators(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunityModerator.ICreate;
}): Promise<IRedditCloneCommunityModerator> {
  // Step 1: Validate community exists and is not deleted
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
    });
  // Step 2: Check if requesting moderator has permission (is owner or moderator of this community)
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: props.communityId,
        reddit_clone_user_profile_id: props.moderator.id,
        deleted_at: null,
      },
    });
  if (moderatorAssignment === null) {
    throw new HttpException(
      "You do not have permission to add moderators to this community",
      403,
    );
  }
  // Step 3: Check if user profile exists and is not deleted
  await MyGlobal.prisma.reddit_clone_user_profiles.findUniqueOrThrow({
    where: {
      id: props.body.userProfileId,
      deleted_at: null,
    },
  });
  // Step 4: Check if user is not already a moderator of this community
  const existingAssignment =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: props.communityId,
        reddit_clone_user_profile_id: props.body.userProfileId,
        deleted_at: null,
      },
    });
  if (existingAssignment !== null) {
    throw new HttpException(
      "User is already a moderator of this community",
      409,
    );
  }
  // Step 5-7: Create the moderator assignment using collector and transformer
  const record = await MyGlobal.prisma.reddit_clone_community_moderators.create(
    {
      data: await RedditCloneCommunityModeratorCollector.collect({
        body: props.body,
        redditCloneCommunities: community,
      }),
      ...RedditCloneCommunityModeratorTransformer.select(),
    },
  );
  return await RedditCloneCommunityModeratorTransformer.transform(record);
}

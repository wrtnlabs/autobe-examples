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
import { RedditCloneCommunityBanCollector } from "../collectors/RedditCloneCommunityBanCollector";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditCloneCommunityBanTransformer } from "../transformers/RedditCloneCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneModeratorCommunitiesCommunityIdBans(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunityBan.ICreate;
}): Promise<IRedditCloneCommunityBan> {
  // 1. Verify community exists and is not deleted
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_id: true,
      },
    });
  // 2. Verify moderator is assigned to this community
  const moderatorRecord =
    await MyGlobal.prisma.reddit_clone_moderators.findUnique({
      where: {
        id: props.moderator.id,
      },
      select: {
        reddit_clone_user_profile_id: true,
      },
    });
  if (moderatorRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: props.communityId,
        reddit_clone_user_profile_id:
          moderatorRecord.reddit_clone_user_profile_id,
        deleted_at: null,
      },
    });
  if (moderatorAssignment === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Verify member exists and is not deleted
  const member = await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
    where: {
      id: props.body.reddit_clone_member_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  // 4. Prevent banning community owner
  const memberProfile =
    await MyGlobal.prisma.reddit_clone_user_profiles.findFirst({
      where: {
        member: {
          id: props.body.reddit_clone_member_id,
        },
      },
      select: {
        id: true,
      },
    });
  if (memberProfile && memberProfile.id === community.owner_id) {
    throw new HttpException("Cannot ban the community owner", 400);
  }
  // 5. Check if member is already banned in this community
  const existingBan =
    await MyGlobal.prisma.reddit_clone_community_bans.findFirst({
      where: {
        reddit_clone_community_id: props.communityId,
        reddit_clone_member_id: props.body.reddit_clone_member_id,
        deleted_at: null,
      },
    });
  if (existingBan !== null) {
    throw new HttpException("User is already banned from this community", 409);
  }
  // 6. Create the ban record using collector and transformer
  const record = await MyGlobal.prisma.reddit_clone_community_bans.create({
    data: await RedditCloneCommunityBanCollector.collect({
      body: props.body,
      redditCloneCommunities: { id: props.communityId },
      redditCloneModerators: { id: props.moderator.id },
    }),
    ...RedditCloneCommunityBanTransformer.select(),
  });
  // 7. Transform and return the result
  return await RedditCloneCommunityBanTransformer.transform(record);
}

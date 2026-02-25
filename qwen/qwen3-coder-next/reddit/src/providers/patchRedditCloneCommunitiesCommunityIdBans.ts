import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBanRecord";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneBanRecordCollector } from "../collectors/RedditCloneBanRecordCollector";
import { RedditCloneBanRecordTransformer } from "../transformers/RedditCloneBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneCommunitiesCommunityIdBans(props: {
  communityId: string;
  body: IRedditCloneBanRecord.ICreate;
}): Promise<IRedditCloneBanRecord> {
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: props.communityId },
    });
  const member = await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
    where: { id: props.body.member_id },
  });
  const moderator =
    await MyGlobal.prisma.reddit_clone_moderators.findUniqueOrThrow({
      where: { id: community.owner_id },
    });
  const existingBan = await MyGlobal.prisma.reddit_clone_ban_records.findFirst({
    where: {
      community_id: props.communityId,
      member_id: props.body.member_id,
      is_active: true,
    },
  });
  if (existingBan) {
    throw new HttpException("User is already banned from this community", 409);
  }
  const created = await MyGlobal.prisma.reddit_clone_ban_records.create({
    data: await RedditCloneBanRecordCollector.collect({
      body: props.body,
      redditCloneCommunities: community,
      redditCloneModerators: moderator,
      redditCloneMemberSessions: { id: moderator.id },
    }),
    ...RedditCloneBanRecordTransformer.select(),
  });
  return await RedditCloneBanRecordTransformer.transform(created);
}

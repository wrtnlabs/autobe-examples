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
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditCloneBanRecordTransformer } from "../transformers/RedditCloneBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneOwnerCommunitiesCommunityIdBans(props: {
  owner: OwnerPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneBanRecord.ICreate;
}): Promise<IRedditCloneBanRecord> {
  // Verify owner is authorized for target community
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: props.communityId },
    });
  // Check user is not already banned
  const existingBan = await MyGlobal.prisma.reddit_clone_ban_records.findFirst({
    where: {
      community_id: props.communityId,
      member_id: props.body.member_id,
      is_active: true,
    },
  });
  if (existingBan) {
    throw new HttpException("User already banned", 400);
  }
  // Create ban record
  const created = await MyGlobal.prisma.reddit_clone_ban_records.create({
    data: await RedditCloneBanRecordCollector.collect({
      body: props.body,
      redditCloneCommunities: { id: community.id },
      redditCloneModerators: { id: props.owner.id },
      redditCloneMemberSessions: { id: props.owner.session_id },
    }),
    ...RedditCloneBanRecordTransformer.select(),
  });
  return await RedditCloneBanRecordTransformer.transform(created);
}

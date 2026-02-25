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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditCloneBanRecordTransformer } from "../transformers/RedditCloneBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneModeratorCommunitiesCommunityIdBans(props: {
  moderator: ModeratorPayload;
  communityId: string;
  body: IRedditCloneBanRecord.ICreate;
}): Promise<IRedditCloneBanRecord> {
  // Verify moderator is assigned to the target community with appropriate role
  const assignment =
    await MyGlobal.prisma.reddit_clone_moderator_assignments.findFirst({
      where: {
        appointed_actor_id: props.moderator.id,
        community_id: props.communityId,
        role: { in: ["moderator", "owner"] },
      },
    });
  if (assignment === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Use Collector to transform request into database input
  const created = await MyGlobal.prisma.reddit_clone_ban_records.create({
    data: await RedditCloneBanRecordCollector.collect({
      body: props.body,
      redditCloneCommunities: { id: props.communityId },
      redditCloneModerators: { id: props.moderator.id },
      redditCloneMemberSessions: { id: props.moderator.session_id },
    }),
    ...RedditCloneBanRecordTransformer.select(),
  });
  // Use Transformer to build response DTO
  return await RedditCloneBanRecordTransformer.transform(created);
}

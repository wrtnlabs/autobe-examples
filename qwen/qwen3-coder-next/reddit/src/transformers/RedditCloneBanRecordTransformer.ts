import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBanRecord";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";
import { RedditCloneModerationAppealAtSummaryTransformer } from "./RedditCloneModerationAppealAtSummaryTransformer";
import { RedditCloneModeratorAtSummaryTransformer } from "./RedditCloneModeratorAtSummaryTransformer";

export namespace RedditCloneBanRecordTransformer {
  export type Payload = Prisma.reddit_clone_ban_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        community: RedditCloneCommunityAtSummaryTransformer.select(),
        member: RedditCloneMemberAtSummaryTransformer.select(),
        moderator: RedditCloneModeratorAtSummaryTransformer.select(),
        appeal: RedditCloneModerationAppealAtSummaryTransformer.select(),
        created_at: true,
        expires_at: true,
        reason: true,
        is_active: true,
        lifted_at: true,
      },
    } satisfies Prisma.reddit_clone_ban_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneBanRecord> {
    return {
      id: input.id,
      community_id: input.community.id,
      member_id: input.member.id,
      moderator_id: input.moderator.id,
      appeal_id: input.appeal?.id ?? null,
      created_at: toISOStringSafe(input.created_at),
      expires_at: input.expires_at ? toISOStringSafe(input.expires_at) : null,
      reason: input.reason,
      is_active: input.is_active,
      lifted_at: input.lifted_at ? toISOStringSafe(input.lifted_at) : null,
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      member: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      moderator: await RedditCloneModeratorAtSummaryTransformer.transform(
        input.moderator,
      ),
      appeal: input.appeal
        ? await RedditCloneModerationAppealAtSummaryTransformer.transform(
            input.appeal,
          )
        : null,
    };
  }
}

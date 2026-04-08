import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";
import { RedditCloneModeratorAtSummaryTransformer } from "./RedditCloneModeratorAtSummaryTransformer";

export namespace RedditCloneCommunityBanTransformer {
  export type Payload = Prisma.reddit_clone_community_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ban_reason: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: RedditCloneCommunityAtSummaryTransformer.select(),
        bannedMember: RedditCloneMemberAtSummaryTransformer.select(),
        banningModerator: RedditCloneModeratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_community_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommunityBan> {
    return {
      id: input.id,
      banReason: input.ban_reason,
      expiresAt: input.expires_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      bannedMember: await RedditCloneMemberAtSummaryTransformer.transform(
        input.bannedMember,
      ),
      banningModerator:
        await RedditCloneModeratorAtSummaryTransformer.transform(
          input.banningModerator,
        ),
    };
  }
}

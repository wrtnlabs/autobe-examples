import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityBanAtSummaryTransformer } from "./RedditCloneCommunityBanAtSummaryTransformer";
import { RedditCloneMemberSessionAtSummaryTransformer } from "./RedditCloneMemberSessionAtSummaryTransformer";

export namespace RedditCloneUserKarmaAtSummaryTransformer {
  // 1. Payload type first
  export type Payload = Prisma.reddit_clone_bansGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        expires_at: true,
        community: RedditCloneCommunityBanAtSummaryTransformer.select(),
        bannedUser: RedditCloneMemberSessionAtSummaryTransformer.select(),
        issuer: RedditCloneMemberSessionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_bansFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneUserKarma.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      expires_at: input.expires_at?.toISOString() ?? null,
      bannedUser: await RedditCloneMemberSessionAtSummaryTransformer.transform(
        input.bannedUser,
      ),
      issuer: await RedditCloneMemberSessionAtSummaryTransformer.transform(
        input.issuer,
      ),
      community: await RedditCloneCommunityBanAtSummaryTransformer.transform(
        input.community,
      ),
    };
  }
}

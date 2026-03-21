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

export namespace RedditCloneUserKarmaTransformer {
  export type Payload = Prisma.reddit_clone_bansGetPayload<
    ReturnType<typeof select>
  >;
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
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneUserKarma> {
    return {
      id: input.id,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      expires_at: input.expires_at?.toISOString() ?? null,
      community: await RedditCloneCommunityBanAtSummaryTransformer.transform(
        input.community,
      ),
      bannedUser: await RedditCloneMemberSessionAtSummaryTransformer.transform(
        input.bannedUser,
      ),
      issuer: await RedditCloneMemberSessionAtSummaryTransformer.transform(
        input.issuer,
      ),
    };
  }
}

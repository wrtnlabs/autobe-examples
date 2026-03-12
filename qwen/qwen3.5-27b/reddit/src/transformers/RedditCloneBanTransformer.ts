import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneBanTransformer {
  export type Payload = Prisma.reddit_clone_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        community: RedditCloneCommunityAtSummaryTransformer.select(),
        member: RedditCloneMemberAtSummaryTransformer.select(),
        reason: true,
        banned_at: true,
        lifted_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.reddit_clone_bansFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditCloneBan> {
    return {
      id: input.id,
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      member: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      reason: input.reason ?? null,
      banned_at: input.banned_at.toISOString(),
      lifted_at: input.lifted_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}

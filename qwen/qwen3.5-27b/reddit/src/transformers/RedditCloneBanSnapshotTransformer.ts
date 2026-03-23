import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import { IRedditCloneBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBanSnapshot";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneBanAtSummaryTransformer } from "./RedditCloneBanAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneBanSnapshotTransformer {
  export type Payload = Prisma.reddit_clone_ban_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ban: RedditCloneBanAtSummaryTransformer.select(),
        bannedBy: RedditCloneMemberAtSummaryTransformer.select(),
        member_id: true,
        community_id: true,
        reason: true,
        banned_at: true,
        lifted_at: true,
        created_at: true,
      },
    } satisfies Prisma.reddit_clone_ban_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneBanSnapshot> {
    return {
      id: input.id,
      ban: await RedditCloneBanAtSummaryTransformer.transform(input.ban),
      bannedBy: await RedditCloneMemberAtSummaryTransformer.transform(
        input.bannedBy,
      ),
      member: {
        id: input.member_id,
        username: "",
        display_name: "",
        avatar_uri: null,
        karma: 0,
        created_at: "1970-01-01T00:00:00.000Z",
      } satisfies IRedditCloneMember.ISummary,
      community: {
        id: input.community_id,
        name: "",
        description: null,
        icon: null,
        subscriber_count: 0,
        created_at: "1970-01-01T00:00:00.000Z",
        owner: {
          id: "",
          username: "",
          display_name: "",
          avatar_uri: null,
          karma: 0,
          created_at: "1970-01-01T00:00:00.000Z",
        } satisfies IRedditCloneMember.ISummary,
      } satisfies IRedditCloneCommunity.ISummary,
      reason: input.reason ?? null,
      banned_at: input.banned_at.toISOString(),
      lifted_at: input.lifted_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBanSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneBanSnapshotAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_ban_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        member_id: true,
        community_id: true,
        reason: true,
        banned_at: true,
        lifted_at: true,
        created_at: true,
        ban: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_clone_bansFindManyArgs,
        bannedBy: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_clone_membersFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_ban_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneBanSnapshot.ISummary> {
    return {
      id: input.id,
      ban_id: input.ban.id,
      member_id: input.member_id,
      community_id: input.community_id,
      banned_by_id: input.bannedBy.id,
      reason: input.reason ?? null,
      banned_at: input.banned_at.toISOString(),
      lifted_at: input.lifted_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityKarmaSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKarmaSnapshot";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityVoteAtSummaryTransformer } from "./RedditCommunityVoteAtSummaryTransformer";

export namespace RedditCommunityKarmaSnapshotAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_karma_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        karma_delta: true,
        karma_after_change: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reddit_community_user_id: true,
        reddit_community_vote_id: true,
      },
    } as Prisma.reddit_community_karma_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityKarmaSnapshot.ISummary> {
    return {
      id: input.id,
      user: await RedditCommunityMemberAtSummaryTransformer.transform({
        id: input.reddit_community_user_id,
      } as any),
      vote: await RedditCommunityVoteAtSummaryTransformer.transform({
        id: input.reddit_community_vote_id,
      } as any),
      karma_delta: input.karma_delta,
      karma_after_change: input.karma_after_change,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}

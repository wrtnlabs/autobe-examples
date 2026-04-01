import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarmaHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityUserKarmaHistoryTransformer {
  export type Payload = Prisma.reddit_community_user_karma_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        change_amount: true,
        new_total: true,
        source_type: true,
        source_id: true,
        created_at: true,
        user: RedditCommunityMemberAtSummaryTransformer.select(),
        voter: RedditCommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_user_karma_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityUserKarmaHistory> {
    return {
      id: input.id,
      change_amount: input.change_amount,
      new_total: input.new_total,
      source_type: input.source_type,
      source_id: input.source_id,
      created_at: input.created_at.toISOString(),
      user: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.user,
      ),
      voter: input.voter
        ? await RedditCommunityMemberAtSummaryTransformer.transform(input.voter)
        : null,
    };
  }
}

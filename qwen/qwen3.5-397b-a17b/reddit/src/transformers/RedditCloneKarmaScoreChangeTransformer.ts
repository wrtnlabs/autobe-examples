import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import { IRedditCloneKarmaScoreChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScoreChange";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneKarmaScoreAtSummaryTransformer } from "./RedditCloneKarmaScoreAtSummaryTransformer";

export namespace RedditCloneKarmaScoreChangeTransformer {
  export type Payload = Prisma.reddit_clone_karma_score_changesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        source_type: true,
        source_id: true,
        change_amount: true,
        created_at: true,
        karmaScore: RedditCloneKarmaScoreAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_karma_score_changesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneKarmaScoreChange> {
    return {
      id: input.id,
      karmaScore: await RedditCloneKarmaScoreAtSummaryTransformer.transform(
        input.karmaScore,
      ),
      sourceType: input.source_type,
      sourceId: input.source_id,
      changeAmount: input.change_amount,
      createdAt: input.created_at.toISOString(),
    };
  }
}

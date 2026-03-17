import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneKarmaScoreChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScoreChange";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneKarmaScoreChangeAtSummaryTransformer {
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
      },
    } satisfies Prisma.reddit_clone_karma_score_changesFindManyArgs;
  }
  export async function transform(
    input: Payload,
    sourceTitle: string,
  ): Promise<IRedditCloneKarmaScoreChange.ISummary> {
    return {
      id: input.id,
      source_type: input.source_type,
      source_title: sourceTitle,
      change_amount: input.change_amount,
      created_at: input.created_at.toISOString(),
    };
  }
}

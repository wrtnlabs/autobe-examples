import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationQueue";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";

export namespace DiscussionBoardModerationQueueAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_moderation_queueGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        reason: true,
        submitted_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article: DiscussionBoardArticleAtSummaryTransformer.select(),
        submitter: DiscussionBoardMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_moderation_queueFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardModerationQueue.ISummary> {
    return {
      id: input.id,
      status: input.status as "pending" | "approved" | "rejected",
      submittedAt: input.submitted_at.toISOString(),
      articleSummary:
        await DiscussionBoardArticleAtSummaryTransformer.transform(
          input.article,
        ),
    };
  }
}

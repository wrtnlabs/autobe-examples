import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { IDiscussionBoardModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationQueue";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { DiscussionBoardModerationQueueAtSummaryTransformer } from "./DiscussionBoardModerationQueueAtSummaryTransformer";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";

export async function transform(
  input: Payload,
): Promise<IDiscussionBoardModerationAction> {
  return {
    id: input.id,
    moderationQueue:
      await DiscussionBoardModerationQueueAtSummaryTransformer.transform(
        input.moderation_queue,
      ),
    article: await DiscussionBoardArticleAtSummaryTransformer.transform(
      input.article,
    ),
    actionStatus: input.status as "pending" | "approved" | "rejected",
    actionReason: input.reason ?? undefined,
    createdAt: toISOStringSafe(input.created_at),
  };
}

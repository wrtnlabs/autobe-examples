import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";

export namespace DiscussionBoardModerationActionAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_moderation_actionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        created_at: true,
        article: DiscussionBoardArticleAtSummaryTransformer.select(),
        reason: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.discussion_board_moderation_actionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardModerationAction.ISummary> {
    const actionTypeMap: Record<string, "approve" | "reject" | "archive"> = {
      approved: "approve",
      rejected: "reject",
      archived: "archive",
    };
    return {
      id: input.id,
      actionType: actionTypeMap[input.status] || input.status,
      createdAt: input.created_at.toISOString(),
      article: await DiscussionBoardArticleAtSummaryTransformer.transform(
        input.article,
      ),
    };
  }
}

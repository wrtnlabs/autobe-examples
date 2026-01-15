import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardArticleStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleStatusLog";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleStatusLogAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_article_status_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.discussion_board_article_status_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleStatusLog.ISummary> {
    return {
      id: input.id,
      status:
        input.status as IDiscussionBoardArticleStatusLog.ISummary["status"],
      status_changed_by: input.reason === null ? "system" : "moderator",
      status_changed_at: input.created_at.toISOString(),
      status_changed_reason: input.reason ?? undefined,
      is_final: true, // Logical default: assume this log record represents the final state
      prev_status:
        input.status as IDiscussionBoardArticleStatusLog.ISummary["prev_status"],
    };
  }
}

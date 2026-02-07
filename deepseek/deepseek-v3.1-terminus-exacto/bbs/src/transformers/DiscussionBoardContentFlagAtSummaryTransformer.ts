import { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardContentFlagAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_content_flagsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        flag_reason: true,
        status: true,
        created_at: true,
        resolved_at: true,
        reporter_user_id: true,
        flaggedArticle: {
          select: {
            id: true,
          },
        },
        flaggedComment: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_content_flagsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardContentFlag.ISummary> {
    return {
      id: input.id,
      flag_reason: input.flag_reason,
      status: input.status,
      created_at: toISOStringSafe(input.created_at),
      resolved_at: input.resolved_at
        ? toISOStringSafe(input.resolved_at)
        : null,
      reporter_user_id: input.reporter_user_id,
      flagged_article_id: input.flaggedArticle?.id ?? null,
      flagged_comment_id: input.flaggedComment?.id ?? null,
    };
  }
}

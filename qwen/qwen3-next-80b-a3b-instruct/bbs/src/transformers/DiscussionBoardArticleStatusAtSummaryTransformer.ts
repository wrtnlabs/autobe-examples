import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardArticleStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleStatus";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleStatusAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_article_statusesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article: true,
      },
    } satisfies Prisma.discussion_board_article_statusesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleStatus.ISummary> {
    return {
      id: input.id,
      name: input.status,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}

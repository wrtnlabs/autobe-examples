import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IArticleStatusUpdateResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IArticleStatusUpdateResult";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ArticleStatusUpdateResultTransformer {
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
        article: {
          select: {
            id: true,
          },
        },
        actor: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_article_status_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IArticleStatusUpdateResult> {
    return {
      id: input.id,
      articleId: input.article.id,
      status: input.status as "published" | "hidden" | "deleted",
      changedAt: input.created_at.toISOString(),
      changedBy: input.actor.id,
    };
  }
}

import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardArticlePublicationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticlePublicationLog";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticlePublicationLogTransformer {
  export type Payload =
    Prisma.discussion_board_article_publication_logGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        status_from: true,
        status_to: true,
        created_at: true,
        reason: true,
        article: {
          select: {
            id: true,
          },
        },
        moderationActor: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_article_publication_logFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticlePublicationLog> {
    return {
      id: input.id,
      article_id: input.article.id,
      old_status: input.status_from,
      new_status: input.status_to,
      timestamp: toISOStringSafe(input.created_at),
      reason: input.reason ?? undefined,
      actor_id: input.moderationActor.id,
    };
  }
}

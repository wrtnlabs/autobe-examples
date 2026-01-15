import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardArticleStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleStatusLog";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleStatusLogTransformer {
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
  ): Promise<IDiscussionBoardArticleStatusLog> {
    return {
      id: input.id,
      article_id: input.article.id,
      // Cast string to enum union type
      status: input.status as IDiscussionBoardArticleStatusLog["status"],
      // previous_status is not stored in database - use placeholder with correct enum type
      // This represents a system design limitation - previous_status should be computed from history
      // and not available in single-record responses
      previous_status:
        input.status === "draft"
          ? "draft"
          : input.status === "pending"
            ? "draft"
            : input.status === "published"
              ? "pending"
              : input.status === "hidden"
                ? "published"
                : "hidden",
      created_at: input.created_at.toISOString(),
    };
  }
}

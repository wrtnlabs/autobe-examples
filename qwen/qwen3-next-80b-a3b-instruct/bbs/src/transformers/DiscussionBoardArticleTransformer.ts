import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleTransformer {
  export type Payload = Prisma.discussion_board_articlesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: true,
        category: true,
        discussion_board_attachments: true,
        discussion_board_article_images: true,
        discussion_board_article_files: true,
        discussion_board_article_publication_log: true,
        discussion_board_article_reports: true,
        discussion_board_article_comments: true,
        discussion_board_article_status_logs: true,
        discussion_board_article_statuses: true,
        discussion_board_attachment_images: true,
        discussion_board_report_aggregations: true,
        discussion_board_audit_events: true,
        discussion_board_compliance_records: true,
      },
    } satisfies Prisma.discussion_board_articlesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticle> {
    return {
      id: input.id,
      title: input.title,
      content: input.body,
      status: input.deleted_at === null ? "published" : "hidden",
      created_at: input.created_at.toISOString(),
    };
  }
}

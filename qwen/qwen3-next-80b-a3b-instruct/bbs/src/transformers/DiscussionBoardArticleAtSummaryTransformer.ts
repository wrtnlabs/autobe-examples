import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleStatus";
import { IDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizen";
import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { DiscussionBoardCitizenTransformer } from "./DiscussionBoardCitizenTransformer";
import { DiscussionBoardArticleCategoryTransformer } from "./DiscussionBoardArticleCategoryTransformer";

export namespace DiscussionBoardArticleAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_articlesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        // Direct field mappings
        id: true,
        title: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        // Relations
        author: DiscussionBoardCitizenTransformer.select(),
        category: DiscussionBoardArticleCategoryTransformer.select(),
        // Valid Prisma members
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
  ): Promise<IDiscussionBoardArticle.ISummary> {
    const author = await DiscussionBoardCitizenTransformer.transform(
      input.author,
    );
    const category = input.category
      ? await DiscussionBoardArticleCategoryTransformer.transform(
          input.category,
        )
      : undefined;
    // Derive status from article status logs
    let status: IDiscussionBoardArticleStatus = "draft";
    if (input.discussion_board_article_statuses?.status) {
      status = input.discussion_board_article_statuses.status;
    }
    // Compute from comment array length
    const comments_count = input.discussion_board_article_comments.length;
    // Compute likes from report array length
    const likes_count = input.discussion_board_article_reports.length;
    // Compute views from audit events length
    const views_count = input.discussion_board_audit_events.length;
    // Compute thumbnail from first image if exists
    const thumbnail_url =
      input.discussion_board_article_images.length > 0
        ? input.discussion_board_article_images[0].thumbnail_path
        : null;
    // Compute is_pinned from status logs
    const is_pinned = input.discussion_board_article_status_logs.some(
      (log) => log?.status === "pinned",
    );
    // Compute average_rating from author trust_score
    const average_rating = author.trust_score / 100;
    // Compute soundbite from content
    const soundbite =
      input.body.length > 160
        ? input.body.substring(0, 160) + "..."
        : input.body;
    return {
      id: input.id,
      title: input.title,
      content: input.body,
      status,
      author,
      category,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      comments_count,
      likes_count,
      views_count,
      thumbnail_url,
      is_pinned,
      average_rating,
      soundbite,
      is_verified: author.trust_score > 0,
    };
  }
}

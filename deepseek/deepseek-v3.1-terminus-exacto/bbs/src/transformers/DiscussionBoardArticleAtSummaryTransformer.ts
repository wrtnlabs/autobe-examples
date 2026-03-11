import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleTagAtSummaryTransformer } from "./DiscussionBoardArticleTagAtSummaryTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";
import { DiscussionBoardSectionAtSummaryTransformer } from "./DiscussionBoardSectionAtSummaryTransformer";

export namespace DiscussionBoardArticleAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_articlesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        body: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: DiscussionBoardMemberAtSummaryTransformer.select(),
        section: DiscussionBoardSectionAtSummaryTransformer.select(),
        tags: DiscussionBoardArticleTagAtSummaryTransformer.select(),
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_article_snapshotsFindManyArgs,
        viewStats: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_article_view_statsFindManyArgs,
        favorites: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_article_favoritesFindManyArgs,
        reactions: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_article_reactionsFindManyArgs,
        metadatum: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_article_metadataFindManyArgs,
        comments: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_commentsFindManyArgs,
        commentStatistic: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_mv_article_commentsFindManyArgs,
        attachments: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_attachmentsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_articlesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticle.ISummary> {
    return {
      id: input.id,
      title: input.title,
      author: await DiscussionBoardMemberAtSummaryTransformer.transform(
        input.author,
      ),
      section: await DiscussionBoardSectionAtSummaryTransformer.transform(
        input.section,
      ),
      tags: await ArrayUtil.asyncMap(
        input.tags,
        DiscussionBoardArticleTagAtSummaryTransformer.transform,
      ),
      comments_count: input.comments.length,
      created_at: input.created_at.toISOString(),
    };
  }
}

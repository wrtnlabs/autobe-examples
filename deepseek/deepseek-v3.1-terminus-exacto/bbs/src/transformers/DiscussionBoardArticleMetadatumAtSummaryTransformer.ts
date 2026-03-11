import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleMetadatum";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";

export namespace DiscussionBoardArticleMetadatumAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_article_metadataGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        meta_title: true,
        meta_description: true,
        meta_keywords: true,
        reading_time_minutes: true,
        is_featured: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article: DiscussionBoardArticleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_article_metadataFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleMetadatum.ISummary> {
    return {
      id: input.id,
      metaTitle: input.meta_title ?? null,
      metaDescription: input.meta_description ?? null,
      metaKeywords: input.meta_keywords ?? null,
      readingTimeMinutes: input.reading_time_minutes ?? null,
      isFeatured: input.is_featured,
      createdAt: input.created_at.toISOString(),
      article: await DiscussionBoardArticleAtSummaryTransformer.transform(
        input.article,
      ),
    };
  }
}

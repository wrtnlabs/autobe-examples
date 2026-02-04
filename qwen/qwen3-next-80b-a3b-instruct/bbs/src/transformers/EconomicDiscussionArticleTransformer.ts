import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicDiscussionArticleTagAtSummaryTransformer } from "./EconomicDiscussionArticleTagAtSummaryTransformer";
import { EconomicDiscussionCitizenAtSummaryTransformer } from "./EconomicDiscussionCitizenAtSummaryTransformer";

export namespace EconomicDiscussionArticleTransformer {
  export type Payload = Prisma.economic_discussion_articlesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        created_at: true,
        comment_count: true,
        author: EconomicDiscussionCitizenAtSummaryTransformer.select(),
        economic_discussion_article_tags:
          EconomicDiscussionArticleTagAtSummaryTransformer.select(),
        content: true,
        view_count: true,
        updated_at: true,
        section: { select: { id: true } },
        economic_discussion_article_files: {
          select: {
            id: true,
            filename: true,
            file_path: true,
          },
        },
        economic_discussion_comments: {
          select: {
            id: true,
            content: true,
            created_at: true,
          },
        },
      },
    } satisfies Prisma.economic_discussion_articlesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicDiscussionArticle> {
    return {
      id: input.id,
      title: input.title,
      posted_time: input.created_at.toISOString(),
      comment_count: input.comment_count,
      author: await EconomicDiscussionCitizenAtSummaryTransformer.transform(
        input.author,
      ),
      tags: await ArrayUtil.asyncMap(
        input.economic_discussion_article_tags,
        (tag) =>
          EconomicDiscussionArticleTagAtSummaryTransformer.transform(tag),
      ),
    };
  }
}

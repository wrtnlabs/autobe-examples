import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicDiscussionArticleTagAtSummaryTransformer } from "./EconomicDiscussionArticleTagAtSummaryTransformer";
import { EconomicDiscussionCitizenAtSummaryTransformer } from "./EconomicDiscussionCitizenAtSummaryTransformer";

export namespace EconomicDiscussionArticleAtSummaryTransformer {
  export type Payload = Prisma.economic_discussion_articlesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        created_at: true,
        author: EconomicDiscussionCitizenAtSummaryTransformer.select(),
        economic_discussion_article_tags:
          EconomicDiscussionArticleTagAtSummaryTransformer.select(),
        _count: {
          select: {
            economic_discussion_comments: true,
          },
        },
      },
    } satisfies Prisma.economic_discussion_articlesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicDiscussionArticle.ISummary> {
    return {
      id: input.id,
      title: input.title,
      created_at: input.created_at.toISOString(),
      author: await EconomicDiscussionCitizenAtSummaryTransformer.transform(
        input.author,
      ),
      comment_count: input._count.economic_discussion_comments,
      tags: await ArrayUtil.asyncMap(
        input.economic_discussion_article_tags,
        (tag) =>
          EconomicDiscussionArticleTagAtSummaryTransformer.transform(tag),
      ),
    };
  }
}

import { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicDiscussionArticleTagAtSummaryTransformer {
  export type Payload = Prisma.economic_discussion_article_tagsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        tag: true,
        article: {
          select: {
            title: true,
          },
        },
      },
    } satisfies Prisma.economic_discussion_article_tagsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicDiscussionArticleTag.ISummary> {
    return {
      name: input.article.title,
    };
  }
}

import { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import { IEconomicBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleAttachment";
import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicBoardArticleAttachmentAtSummaryTransformer } from "./EconomicBoardArticleAttachmentAtSummaryTransformer";
import { EconomicBoardCitizenAtSummaryTransformer } from "./EconomicBoardCitizenAtSummaryTransformer";
import { EconomicBoardSectionAtSummaryTransformer } from "./EconomicBoardSectionAtSummaryTransformer";

export namespace EconomicBoardArticleTransformer {
  export type Payload = Prisma.economic_board_articlesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content: true,
        created_at: true,
        updated_at: true,
        is_deleted: true,
        section: EconomicBoardSectionAtSummaryTransformer.select(),
        author: EconomicBoardCitizenAtSummaryTransformer.select(),
        attachments:
          EconomicBoardArticleAttachmentAtSummaryTransformer.select(),
        comments: true,
        articleTags: true,
        snapshots: true,
        views: true,
      },
    } satisfies Prisma.economic_board_articlesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicBoardArticle> {
    return {
      id: input.id,
      title: input.title,
      content: input.content,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      is_deleted: input.is_deleted,
      section: await EconomicBoardSectionAtSummaryTransformer.transform(
        input.section,
      ),
      author: await EconomicBoardCitizenAtSummaryTransformer.transform(
        input.author,
      ),
      attachments: await ArrayUtil.asyncMap(
        input.attachments,
        EconomicBoardArticleAttachmentAtSummaryTransformer.transform,
      ),
      comments_count: input.comments.length,
      tags: input.articleTags.map((tagObj) => tagObj.tag),
    };
  }
}

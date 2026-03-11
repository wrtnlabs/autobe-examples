import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicPoliticalBoardAttachmentAtSummaryTransformer } from "./EconomicPoliticalBoardAttachmentAtSummaryTransformer";
import { EconomicPoliticalBoardMemberAtSummaryTransformer } from "./EconomicPoliticalBoardMemberAtSummaryTransformer";
import { EconomicPoliticalBoardSectionAtSummaryTransformer } from "./EconomicPoliticalBoardSectionAtSummaryTransformer";
import { EconomicPoliticalBoardTagAtSummaryTransformer } from "./EconomicPoliticalBoardTagAtSummaryTransformer";

export namespace EconomicPoliticalBoardArticleTransformer {
  export type Payload = Prisma.economic_political_board_articlesGetPayload<
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
        deleted_at: true,
        author: EconomicPoliticalBoardMemberAtSummaryTransformer.select(),
        section: EconomicPoliticalBoardSectionAtSummaryTransformer.select(),
        attachments:
          EconomicPoliticalBoardAttachmentAtSummaryTransformer.select(),
        comments: {
          select: { deleted_at: true },
        } satisfies Prisma.economic_political_board_commentsFindManyArgs,
        articleTags: {
          select: {
            tag: EconomicPoliticalBoardTagAtSummaryTransformer.select(),
          },
        } satisfies Prisma.economic_political_board_article_tagsFindManyArgs,
      },
    } satisfies Prisma.economic_political_board_articlesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalBoardArticle> {
    return {
      id: input.id,
      title: input.title,
      content: input.content,
      author: await EconomicPoliticalBoardMemberAtSummaryTransformer.transform(
        input.author,
      ),
      section:
        await EconomicPoliticalBoardSectionAtSummaryTransformer.transform(
          input.section,
        ),
      attachments: await ArrayUtil.asyncMap(
        input.attachments,
        EconomicPoliticalBoardAttachmentAtSummaryTransformer.transform,
      ),
      tags: await ArrayUtil.asyncMap(input.articleTags, (at) =>
        EconomicPoliticalBoardTagAtSummaryTransformer.transform(at.tag),
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      comment_count: input.comments.filter((c) => c.deleted_at === null).length,
    };
  }
}

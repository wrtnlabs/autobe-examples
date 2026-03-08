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
import { EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer } from "./EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer";
import { EconomicPoliticalBoardAttachmentTransformer } from "./EconomicPoliticalBoardAttachmentTransformer";
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
        author:
          EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.select(),
        section: EconomicPoliticalBoardSectionAtSummaryTransformer.select(),
        attachments: EconomicPoliticalBoardAttachmentTransformer.select(),
        articleTags: {
          select: {
            tag: EconomicPoliticalBoardTagAtSummaryTransformer.select(),
          },
        },
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
      author:
        await EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.transform(
          input.author,
        ),
      section:
        await EconomicPoliticalBoardSectionAtSummaryTransformer.transform(
          input.section,
        ),
      attachments: await ArrayUtil.asyncMap(
        input.attachments,
        EconomicPoliticalBoardAttachmentTransformer.transform,
      ),
      tags: await ArrayUtil.asyncMap(input.articleTags, (at) =>
        EconomicPoliticalBoardTagAtSummaryTransformer.transform(at.tag),
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}

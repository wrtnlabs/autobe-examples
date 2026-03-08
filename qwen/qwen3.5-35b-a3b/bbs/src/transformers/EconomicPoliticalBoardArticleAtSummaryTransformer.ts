import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer } from "./EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer";
import { EconomicPoliticalBoardSectionAtSummaryTransformer } from "./EconomicPoliticalBoardSectionAtSummaryTransformer";

export namespace EconomicPoliticalBoardArticleAtSummaryTransformer {
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
        attachments: true,
        comments: true,
        articleTags: true,
      },
    } satisfies Prisma.economic_political_board_articlesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalBoardArticle.ISummary> {
    return {
      id: input.id,
      title: input.title,
      author:
        await EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.transform(
          input.author,
        ),
      section:
        await EconomicPoliticalBoardSectionAtSummaryTransformer.transform(
          input.section,
        ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}

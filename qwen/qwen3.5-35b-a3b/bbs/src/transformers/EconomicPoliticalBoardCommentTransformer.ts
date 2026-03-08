import { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardComment";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicPoliticalBoardAdminAtSummaryTransformer } from "./EconomicPoliticalBoardAdminAtSummaryTransformer";
import { EconomicPoliticalBoardArticleAtSummaryTransformer } from "./EconomicPoliticalBoardArticleAtSummaryTransformer";

export namespace EconomicPoliticalBoardCommentTransformer {
  export type Payload = Prisma.economic_political_board_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: EconomicPoliticalBoardAdminAtSummaryTransformer.select(),
        article: EconomicPoliticalBoardArticleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.economic_political_board_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalBoardComment> {
    const author =
      await EconomicPoliticalBoardAdminAtSummaryTransformer.transform(
        input.author,
      );
    return {
      id: input.id,
      author,
      authorName: author.user.displayName,
      isBanned: false,
      content: input.content,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      article:
        await EconomicPoliticalBoardArticleAtSummaryTransformer.transform(
          input.article,
        ),
    } satisfies IEconomicPoliticalBoardComment;
  }
}

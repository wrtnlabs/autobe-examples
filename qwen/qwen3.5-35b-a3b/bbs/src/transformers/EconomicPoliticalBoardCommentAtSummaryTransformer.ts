import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardComment";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer } from "./EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer";

export namespace EconomicPoliticalBoardCommentAtSummaryTransformer {
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
        author:
          EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.select(),
        article: true,
      },
    } satisfies Prisma.economic_political_board_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalBoardComment.ISummary> {
    return {
      id: input.id,
      author:
        await EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.transform(
          input.author,
        ),
      content: input.content,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}

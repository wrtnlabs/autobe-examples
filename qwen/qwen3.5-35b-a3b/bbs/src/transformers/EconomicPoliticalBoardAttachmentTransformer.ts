import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicPoliticalBoardArticleAtSummaryTransformer } from "./EconomicPoliticalBoardArticleAtSummaryTransformer";

export namespace EconomicPoliticalBoardAttachmentTransformer {
  export type Payload = Prisma.economic_political_board_attachmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        file_url: true,
        file_name: true,
        file_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article: EconomicPoliticalBoardArticleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.economic_political_board_attachmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalBoardAttachment> {
    return {
      id: input.id,
      file_url: input.file_url,
      file_name: input.file_name,
      file_type: input.file_type,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      article:
        await EconomicPoliticalBoardArticleAtSummaryTransformer.transform(
          input.article,
        ),
    };
  }
}

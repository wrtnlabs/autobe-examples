import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicPoliticalBoardArticleAtSummaryTransformer } from "./EconomicPoliticalBoardArticleAtSummaryTransformer";

export namespace EconomicPoliticalBoardAttachmentAtSummaryTransformer {
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
  ): Promise<IEconomicPoliticalBoardAttachment.ISummary> {
    return {
      id: input.id,
      fileUrl: input.file_url,
      fileName: input.file_name,
      fileType: typia.assert<"image" | "file">(input.file_type),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: input.updated_at
        ? toISOStringSafe(input.updated_at)
        : undefined,
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      article:
        await EconomicPoliticalBoardArticleAtSummaryTransformer.transform(
          input.article,
        ),
    };
  }
}

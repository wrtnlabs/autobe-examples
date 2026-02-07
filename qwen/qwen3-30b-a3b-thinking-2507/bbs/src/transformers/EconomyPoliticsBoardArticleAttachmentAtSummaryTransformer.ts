import { IEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticle";
import { IEconomyPoliticsBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleAttachment";
import { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomyPoliticsBoardArticleAtSummaryTransformer } from "./EconomyPoliticsBoardArticleAtSummaryTransformer";
import { EconomyPoliticsBoardSectionAtSummaryTransformer } from "./EconomyPoliticsBoardSectionAtSummaryTransformer";
import { EconomyPoliticsBoardUserAtSummaryTransformer } from "./EconomyPoliticsBoardUserAtSummaryTransformer";

export namespace EconomyPoliticsBoardArticleAttachmentAtSummaryTransformer {
  export type Payload =
    Prisma.economy_politics_board_article_attachmentsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        file_type: true,
        size: true,
        download_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article: {
          select: {
            id: true,
            title: true,
            created_at: true,
            author:
              EconomyPoliticsBoardUserAtSummaryTransformer.select().select,
            section:
              EconomyPoliticsBoardSectionAtSummaryTransformer.select().select,
          },
        },
      },
    } satisfies Prisma.economy_politics_board_article_attachmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomyPoliticsBoardArticleAttachment.ISummary> {
    return {
      id: input.id,
      file_type: input.file_type,
      size: input.size,
      download_url: input.download_url,
      article: await EconomyPoliticsBoardArticleAtSummaryTransformer.transform(
        input.article,
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}

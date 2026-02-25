import { IEconomicBoardArticleSnapshotTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleSnapshotTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicBoardArticleSnapshotTagAtSummaryTransformer {
  export type Payload = Prisma.economic_board_article_snapshot_tagsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        articleSnapshot: {
          select: {
            id: true,
          },
        },
        tag: {
          select: {
            tag: true,
          },
        },
      },
    } satisfies Prisma.economic_board_article_snapshot_tagsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicBoardArticleSnapshotTag.ISummary> {
    return {
      tag: input.tag.tag,
      created_at: input.created_at.toISOString(),
    };
  }
}

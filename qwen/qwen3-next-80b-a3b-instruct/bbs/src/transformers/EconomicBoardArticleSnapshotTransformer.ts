import { IEconomicBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicBoardArticleSnapshotTransformer {
  export type Payload = Prisma.economic_board_article_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        snapshot_reason: true,
        article: true,
        articleSnapshotTags: true,
        attachments: true,
      },
    } satisfies Prisma.economic_board_article_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicBoardArticleSnapshot> {
    return {
      id: input.id,
      article_id: input.article.id,
      created_at: toISOStringSafe(input.created_at),
      snapshot_reason: typia.assert<
        "initial" | "edit" | "deletion" | "admin_delete"
      >(input.snapshot_reason),
    };
  }
}

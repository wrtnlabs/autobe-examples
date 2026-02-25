import { IEconomicBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleView";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicBoardArticleViewTransformer {
  export type Payload = Prisma.economic_board_article_viewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        user_type: true,
        created_at: true,
        article: {
          select: {
            id: true,
          },
        },
        user: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.economic_board_article_viewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicBoardArticleView> {
    return {
      id: input.id,
      article_id: input.article.id,
      user_id: input.user.id,
      user_type: typia.assert<"citizen" | "administrator">(input.user_type),
      created_at: toISOStringSafe(input.created_at),
    };
  }
}

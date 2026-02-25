import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicBoardCitizenAtSummaryTransformer } from "./EconomicBoardCitizenAtSummaryTransformer";

export namespace EconomicBoardCommentAtSummaryTransformer {
  export type Payload = Prisma.economic_board_commentsGetPayload<
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
        article: { select: { id: true } },
        author: EconomicBoardCitizenAtSummaryTransformer.select(),
      },
    } satisfies Prisma.economic_board_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicBoardComment.ISummary> {
    return {
      id: input.id,
      content: input.content,
      created_at: input.created_at.toISOString(),
      author: await EconomicBoardCitizenAtSummaryTransformer.transform(
        input.author,
      ),
    };
  }
}

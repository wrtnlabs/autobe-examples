import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IDiscussionBoardAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdministratorAtSummaryTransformer } from "./DiscussionBoardAdministratorAtSummaryTransformer";

export namespace DiscussionBoardAdministratorPromotionTransformer {
  // 1. Payload type
  export type Payload =
    Prisma.discussion_board_administrator_promotionsGetPayload<
      ReturnType<typeof select>
    >;
  // 2. select() function
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        administrator:
          DiscussionBoardAdministratorAtSummaryTransformer.select(),
        oldGrade: DiscussionBoardAdministratorAtSummaryTransformer.select(),
        newGrade: DiscussionBoardAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_administrator_promotionsFindManyArgs;
  }
  // 3. transform() function
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministratorPromotion> {
    return {
      id: input.id,
      administrator:
        await DiscussionBoardAdministratorAtSummaryTransformer.transform(
          input.administrator,
        ),
      oldGrade:
        await DiscussionBoardAdministratorAtSummaryTransformer.transform(
          input.oldGrade,
        ),
      newGrade:
        await DiscussionBoardAdministratorAtSummaryTransformer.transform(
          input.newGrade,
        ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}

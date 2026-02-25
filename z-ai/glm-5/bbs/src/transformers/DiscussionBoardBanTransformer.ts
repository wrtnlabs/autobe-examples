import { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardBanTransformer {
  export type Payload = Prisma.discussion_board_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        created_at: true,
        user: DiscussionBoardUserAtSummaryTransformer.select(),
        administrator: DiscussionBoardUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardBan> {
    return {
      id: input.id,
      user: await DiscussionBoardUserAtSummaryTransformer.transform(input.user),
      administrator: await DiscussionBoardUserAtSummaryTransformer.transform(
        input.administrator,
      ),
      reason: input.reason,
      createdAt: input.created_at.toISOString(),
    };
  }
}

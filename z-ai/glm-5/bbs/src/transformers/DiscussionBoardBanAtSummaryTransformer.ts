import { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardBanAtSummaryTransformer {
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
  ): Promise<IDiscussionBoardBan.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      user: await DiscussionBoardUserAtSummaryTransformer.transform(input.user),
      administrator: await DiscussionBoardUserAtSummaryTransformer.transform(
        input.administrator,
      ),
    };
  }
}

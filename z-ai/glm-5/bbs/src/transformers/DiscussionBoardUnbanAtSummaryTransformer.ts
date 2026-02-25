import { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import { IDiscussionBoardUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUnban";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardBanAtSummaryTransformer } from "./DiscussionBoardBanAtSummaryTransformer";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardUnbanAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_unbansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        created_at: true,
        ban: DiscussionBoardBanAtSummaryTransformer.select(),
        administrator: DiscussionBoardUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_unbansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardUnban.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      administrator: await DiscussionBoardUserAtSummaryTransformer.transform(
        input.administrator,
      ),
      ban: await DiscussionBoardBanAtSummaryTransformer.transform(input.ban),
      created_at: input.created_at.toISOString(),
    };
  }
}

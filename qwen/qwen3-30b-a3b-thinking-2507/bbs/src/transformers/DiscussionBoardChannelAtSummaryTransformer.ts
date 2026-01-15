import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardChannelAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_channelsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        created_at: true,
      },
    } satisfies Prisma.discussion_board_channelsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardChannel.ISummary> {
    return {
      id: input.id,
      name: input.name,
      type: "general",
      active: true,
      created_at: input.created_at.toISOString(),
    };
  }
}

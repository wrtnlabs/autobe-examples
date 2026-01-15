import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

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
        description: true,
        visibility_flag: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        discussion_board_posts: true,
        discussion_board_audit_events: true,
      },
    } satisfies Prisma.discussion_board_channelsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardChannel.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      is_public: input.visibility_flag,
      is_active: input.deleted_at === null,
      created_at: input.created_at.toISOString(),
      color: undefined,
      icon: undefined,
      category: undefined,
      parent_channel: undefined,
    };
  }
}

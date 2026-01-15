import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardChannelTransformer {
  export type Payload = Prisma.discussion_board_channelsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        branding_color: true,
        content_rules: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.discussion_board_channelsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardChannel> {
    return {
      channelCode: input.id,
      name: input.name,
      description: input.description,
      visibility: "public",
    };
  }
}

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
        visibility_flag: true,
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
      name: input.name,
      description: input.description || "",
      visibility: input.visibility_flag ? "published" : "hidden",
      isArchived: input.deleted_at !== null,
      moderationPolicy: "open", // System-inferred: open policy by default
      tags: [], // System-generated: tags provided by configuration layer (not from DB schema)
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}

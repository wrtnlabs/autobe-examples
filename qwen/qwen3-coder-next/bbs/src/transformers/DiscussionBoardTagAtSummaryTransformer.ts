import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardTagAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_tagsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        tag_name: true,
        created_at: true,
      },
    } satisfies Prisma.discussion_board_tagsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardTag.ISummary> {
    return {
      id: input.id,
      tag_name: input.tag_name,
      created_at: input.created_at.toISOString(),
    };
  }
}

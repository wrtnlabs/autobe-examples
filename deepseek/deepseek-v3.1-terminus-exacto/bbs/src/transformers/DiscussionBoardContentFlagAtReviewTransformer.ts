import { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardContentFlagAtReviewTransformer {
  export type Payload = Prisma.discussion_board_content_flagsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        status: true,
        resolution_reason: true,
      },
    } satisfies Prisma.discussion_board_content_flagsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardContentFlag.IReview> {
    return {
      status: input.status,
      resolution_reason: input.resolution_reason ?? null,
    };
  }
}

import { IDiscussionBoardCommentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCommentRateLimitTransformer {
  export type Payload = Prisma.discussion_board_comment_rate_limitsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        user: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_usersFindManyArgs,
        submitted_at: true,
        created_at: true,
      },
    } satisfies Prisma.discussion_board_comment_rate_limitsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentRateLimit> {
    return {
      id: input.id,
      discussion_board_user_id: input.user.id,
      submitted_at: input.submitted_at.toISOString(),
      created_at: input.created_at.toISOString(),
    };
  }
}

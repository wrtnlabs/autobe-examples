import { IDiscussionBoardCommentMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentMention";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardCommentMentionAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_comment_mentionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        position_start: true,
        position_end: true,
        created_at: true,
        comment: true,
        mentionedUser: DiscussionBoardUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_comment_mentionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentMention.ISummary> {
    return {
      id: input.id,
      mentionedUser: await DiscussionBoardUserAtSummaryTransformer.transform(
        input.mentionedUser,
      ),
      position_start: input.position_start,
      position_end: input.position_end,
      created_at: input.created_at.toISOString(),
    };
  }
}

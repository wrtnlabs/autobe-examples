import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardArticleCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCommentReply";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleCommentReplyAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_comment_repliesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent: true,
        author: true,
      },
    } satisfies Prisma.discussion_board_comment_repliesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleCommentReply.ISummary> {
    return {
      id: input.id,
      content: input.content,
      createdAt: input.created_at.toISOString(),
      authorId: input.author.id,
    };
  }
}

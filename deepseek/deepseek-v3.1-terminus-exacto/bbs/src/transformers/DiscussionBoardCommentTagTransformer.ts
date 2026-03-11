import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentTag";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardCommentAtSummaryTransformer } from "./DiscussionBoardCommentAtSummaryTransformer";

export namespace DiscussionBoardCommentTagTransformer {
  export type Payload = Prisma.discussion_board_comment_tagsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        comment: DiscussionBoardCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_comment_tagsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentTag> {
    return {
      id: input.id,
      comment: await DiscussionBoardCommentAtSummaryTransformer.transform(
        input.comment,
      ),
      created_at: input.created_at.toISOString(),
    };
  }
}

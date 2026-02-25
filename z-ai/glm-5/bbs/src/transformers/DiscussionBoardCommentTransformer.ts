import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardCommentTransformer {
  export type Payload = Prisma.discussion_board_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        citizen: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_comment_citizensFindManyArgs,
        content: true,
        author: DiscussionBoardUserAtSummaryTransformer.select(),
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_articlesFindManyArgs,
      },
    } satisfies Prisma.discussion_board_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardComment> {
    return {
      id: input.id,
      citizen_id: input.citizen.id,
      content: input.content,
      author: await DiscussionBoardUserAtSummaryTransformer.transform(
        input.author,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at?.toISOString() ?? null,
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}

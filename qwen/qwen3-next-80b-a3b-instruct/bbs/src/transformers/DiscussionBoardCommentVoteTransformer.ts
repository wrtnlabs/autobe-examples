import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVote";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCommentVoteTransformer {
  export type Payload = Prisma.discussion_board_comment_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        citizen: {
          select: {
            id: true,
          },
        },
        comment: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_comment_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentVote> {
    return {
      value: Number(input.vote_type),
      citizenId: input.citizen.id,
      commentId: input.comment.id,
      createdAt: input.created_at.toISOString(),
    };
  }
}

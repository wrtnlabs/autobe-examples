import { IDiscussionBoardCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardCommentVoteCollector {
  export async function collect(props: {
    body: IDiscussionBoardCommentVote.ICreate;
    user: IEntity;
    comment: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      vote_type: props.body.vote_type,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations
      user: { connect: { id: props.user.id } },
      comment: { connect: { id: props.comment.id } },
    } satisfies Prisma.discussion_board_comment_votesCreateInput;
  }
}

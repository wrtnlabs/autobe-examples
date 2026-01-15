import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVote";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardCommentVoteCollector {
  export async function collect(props: {
    body: IDiscussionBoardCommentVote.ICreate;
    discussionBoardCitizen: IEntity;
    discussionBoardCitizenSessions: IEntity;
    discussionBoardComments: IEntity;
  }) {
    const id: string = v4();
    const voteType: string = props.body.value === 1 ? "upvote" : "downvote";
    return {
      id,
      vote_type: voteType,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      comment: {
        connect: { id: props.discussionBoardComments.id },
      },
      citizen: {
        connect: { id: props.discussionBoardCitizen.id },
      },
    } satisfies Prisma.discussion_board_comment_votesCreateInput;
  }
}

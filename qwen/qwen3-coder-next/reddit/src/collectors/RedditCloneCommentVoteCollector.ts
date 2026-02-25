import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneCommentVoteCollector {
  export async function collect(props: {
    body: IRedditCloneCommentVote.ICreate;
    redditCloneMembers: IEntity;
    redditCloneContentComments: IEntity;
  }) {
    const id: string = v4();
    const vote: number =
      props.body.voteType === "upvote"
        ? 1
        : props.body.voteType === "downvote"
          ? -1
          : 0;
    return {
      id,
      vote,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.redditCloneMembers.id } },
      comment: { connect: { id: props.redditCloneContentComments.id } },
    } satisfies Prisma.reddit_clone_comment_votesCreateInput;
  }
}

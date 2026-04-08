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
    redditCloneComments: IEntity;
  }) {
    return {
      id: v4(),
      vote_type: props.body.vote_type,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.redditCloneMembers.id } },
      comment: { connect: { id: props.redditCloneComments.id } },
    } satisfies Prisma.reddit_clone_comment_votesCreateInput;
  }
}

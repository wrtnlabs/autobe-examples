import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeCommentVoteCollector {
  export async function collect(props: {
    body: IRedditLikeCommentVote.ICreate;
    redditLikeComments: IEntity;
    redditLikeMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      value: props.body.value ?? 0,
      created_at: new Date(),
      comment: { connect: { id: props.redditLikeComments.id } },
      member: { connect: { id: props.redditLikeMembers.id } },
    } satisfies Prisma.reddit_like_comment_votesCreateInput;
  }
}

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeVoteCollector {
  export async function collect(props: {
    body: IRedditLikeVote.ICreate;
    member: IEntity;
    post?: IEntity;
    comment?: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      vote_type: props.body.vote_type,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.member.id } },
      post: props.post ? { connect: { id: props.post.id } } : undefined,
      comment: props.comment
        ? { connect: { id: props.comment.id } }
        : undefined,
    } satisfies Prisma.reddit_like_votesCreateInput;
  }
}

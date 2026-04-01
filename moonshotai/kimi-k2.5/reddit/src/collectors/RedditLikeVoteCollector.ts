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
    redditLikeMembers: IEntity;
  }) {
    return {
      id: v4(),
      vote_type: props.body.vote_type,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.redditLikeMembers.id } },
    } satisfies Prisma.reddit_like_votesCreateInput;
  }
}

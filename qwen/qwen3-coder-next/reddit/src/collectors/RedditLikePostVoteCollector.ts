import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikePostVoteCollector {
  export async function collect(props: {
    body: IRedditLikePostVote.ICreate;
    redditLikeMembers: IEntity;
    redditLikePosts: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      value: props.body.value,
      created_at: new Date(),
      voter: { connect: { id: props.redditLikeMembers.id } },
      post: { connect: { id: props.redditLikePosts.id } },
    } satisfies Prisma.reddit_like_post_votesCreateInput;
  }
}

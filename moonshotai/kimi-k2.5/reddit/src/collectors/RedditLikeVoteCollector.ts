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
    redditLikePosts?: IEntity;
    redditLikeComments?: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      vote_type: props.body.vote_type,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.redditLikeMembers.id } },
      postVote: props.redditLikePosts
        ? {
            create: {
              id: v4(),
              created_at: new Date(),
              updated_at: new Date(),
              post: { connect: { id: props.redditLikePosts.id } },
            },
          }
        : undefined,
      commentVote: props.redditLikeComments
        ? {
            create: {
              id: v4(),
              created_at: new Date(),
              comment: { connect: { id: props.redditLikeComments.id } },
            },
          }
        : undefined,
    } satisfies Prisma.reddit_like_votesCreateInput;
  }
}

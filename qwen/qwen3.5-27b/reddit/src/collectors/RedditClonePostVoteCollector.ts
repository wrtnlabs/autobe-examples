import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditClonePostVoteCollector {
  export async function collect(props: {
    body: IRedditClonePostVote.ICreate;
    redditClonePosts: IEntity;
    redditCloneMembers: IEntity;
  }) {
    return {
      id: v4(),
      vote_type: props.body.vote_type,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: { connect: { id: props.redditClonePosts.id } },
      member: { connect: { id: props.redditCloneMembers.id } },
    } satisfies Prisma.reddit_clone_post_votesCreateInput;
  }
}

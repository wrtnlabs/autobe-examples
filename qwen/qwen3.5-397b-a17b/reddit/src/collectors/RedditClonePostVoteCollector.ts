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
    redditCloneMembers: IEntity;
    redditClonePosts: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      member: { connect: { id: props.redditCloneMembers.id } },
      target_type: "POST",
      target_id: props.redditClonePosts.id,
      vote_type: props.body.vote_type ?? "UPVOTE",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.reddit_clone_votesCreateInput;
  }
}

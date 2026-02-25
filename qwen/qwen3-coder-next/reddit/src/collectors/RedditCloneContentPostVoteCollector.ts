import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneContentPostVoteCollector {
  export async function collect(props: {
    body: IRedditCloneContentPostVote.ICreate;
    redditCloneMembers: IEntity;
    redditCloneContentPosts: IEntity;
  }) {
    const id: string = v4();
    const voteValue =
      props.body.voteType === "upvote"
        ? 1
        : props.body.voteType === "downvote"
          ? -1
          : 0;
    return {
      id,
      vote_value: voteValue,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.redditCloneMembers.id } },
      post: { connect: { id: props.redditCloneContentPosts.id } },
    } satisfies Prisma.reddit_clone_content_post_votesCreateInput;
  }
}

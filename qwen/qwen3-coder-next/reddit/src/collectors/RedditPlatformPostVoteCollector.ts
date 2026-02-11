import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformPostVoteCollector {
  export async function collect(props: {
    body: IRedditPlatformPostVote.ICreate;
    redditPlatformMembers: IEntity;
    redditPlatformPostVotes: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      vote_type: props.body.vote_type,
      created_at: new Date(),
      updated_at: new Date(),
      user: { connect: { id: props.redditPlatformMembers.id } },
      post: { connect: { id: props.redditPlatformPostVotes.id } },
    } satisfies Prisma.reddit_platform_post_votesCreateInput;
  }
}

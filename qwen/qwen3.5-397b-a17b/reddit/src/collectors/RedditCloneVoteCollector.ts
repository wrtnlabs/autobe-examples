import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneVoteCollector {
  export async function collect(props: {
    body: IRedditCloneVote.ICreate;
    redditCloneMembers: IEntity;
    redditCloneComments: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      target_type: "COMMENT",
      target_id: props.redditCloneComments.id,
      vote_type: props.body.vote_type ?? "UPVOTE",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.redditCloneMembers.id } },
    } satisfies Prisma.reddit_clone_votesCreateInput;
  }
}

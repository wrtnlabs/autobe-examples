import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityVoteCollector {
  export async function collect(props: {
    body: IRedditCommunityVote.ICreate;
    redditCommunityMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      vote_type: props.body.vote_type,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.redditCommunityMembers.id } },
      targetPost: props.body.target_post_id
        ? { connect: { id: props.body.target_post_id } }
        : undefined,
      targetComment: props.body.target_comment_id
        ? { connect: { id: props.body.target_comment_id } }
        : undefined,
      karmaSnapshots: undefined,
      postTarget: undefined,
      commentVote: undefined,
    } satisfies Prisma.reddit_community_votesCreateInput;
  }
}

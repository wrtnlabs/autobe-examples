import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityPostVoteCollector {
  export async function collect(props: {
    body: IRedditCommunityPostVote.ICreate;
    member: IEntity;
    post: IEntity;
  }) {
    return {
      id: v4(),
      value: props.body.value,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.member.id } },
      post: { connect: { id: props.post.id } },
    } satisfies Prisma.reddit_community_post_votesCreateInput;
  }
}

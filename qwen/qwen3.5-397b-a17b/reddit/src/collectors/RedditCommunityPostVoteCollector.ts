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
    redditCommunityMembers: IEntity;
    redditCommunityPosts: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      direction: props.body.direction,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.redditCommunityMembers.id } },
      post: { connect: { id: props.redditCommunityPosts.id } },
    } satisfies Prisma.reddit_community_post_votesCreateInput;
  }
}

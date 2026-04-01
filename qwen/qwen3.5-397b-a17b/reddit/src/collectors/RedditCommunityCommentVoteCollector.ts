import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityCommentVoteCollector {
  export async function collect(props: {
    body: IRedditCommunityCommentVote.ICreate;
    redditCommunityMembers: IEntity;
    redditCommunityComments: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      direction: props.body.direction!,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.redditCommunityMembers.id } },
      comment: { connect: { id: props.redditCommunityComments.id } },
    } satisfies Prisma.reddit_community_comment_votesCreateInput;
  }
}

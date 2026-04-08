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
    member: IEntity;
    comment: IEntity;
  }) {
    return {
      id: v4(),
      value: props.body.value,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.member.id } },
      comment: { connect: { id: props.comment.id } },
    } satisfies Prisma.reddit_community_comment_votesCreateInput;
  }
}

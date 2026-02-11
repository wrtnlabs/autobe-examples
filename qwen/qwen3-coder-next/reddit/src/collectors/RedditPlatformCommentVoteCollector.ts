import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformCommentVoteCollector {
  export async function collect(props: {
    body: IRedditPlatformCommentVote.ICreate;
    member: IEntity;
    comment: IEntity;
  }) {
    return {
      id: v4(),
      vote_type: props.body.vote_type,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.member.id } },
      comment: { connect: { id: props.comment.id } },
    } satisfies Prisma.reddit_platform_comment_votesCreateInput;
  }
}

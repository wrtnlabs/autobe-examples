import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneCommentCollector {
  export async function collect(props: {
    body: IRedditCloneComment.ICreate;
    post: IEntity;
    member: IEntity;
  }) {
    return {
      id: v4(),
      content: props.body.content,
      vote_score: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: { connect: { id: props.post.id } },
      member: { connect: { id: props.member.id } },
      parent: props.body.parentCommentId
        ? { connect: { id: props.body.parentCommentId } }
        : undefined,
    } satisfies Prisma.reddit_clone_commentsCreateInput;
  }
}

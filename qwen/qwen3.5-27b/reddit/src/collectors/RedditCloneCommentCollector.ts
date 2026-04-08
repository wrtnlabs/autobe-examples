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
    userProfile: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      content: props.body.content,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      userProfile: { connect: { id: props.userProfile.id } },
      post: { connect: { id: props.post.id } },
      parentComment: props.body.parentCommentId
        ? { connect: { id: props.body.parentCommentId } }
        : undefined,
    } satisfies Prisma.reddit_clone_commentsCreateInput;
  }
}

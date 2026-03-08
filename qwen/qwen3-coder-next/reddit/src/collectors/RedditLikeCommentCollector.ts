import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeCommentCollector {
  export async function collect(props: {
    body: IRedditLikeComment.ICreate;
    member: IEntity;
    post: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      content: props.body.content,
      vote_score: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      author: { connect: { id: props.member.id } },
      post: { connect: { id: props.post.id } },
      parentComment: props.body.parent_comment_id
        ? { connect: { id: props.body.parent_comment_id } }
        : undefined,
    } satisfies Prisma.reddit_like_commentsCreateInput;
  }
}

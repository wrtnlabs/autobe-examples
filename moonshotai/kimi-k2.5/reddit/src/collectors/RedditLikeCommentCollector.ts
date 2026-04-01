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
    redditLikePosts: IEntity;
    redditLikeMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      content: props.body.content,
      vote_score: 0,
      is_edited: false,
      is_deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
      post: { connect: { id: props.redditLikePosts.id } },
      author: { connect: { id: props.redditLikeMembers.id } },
      parent: props.body.parentId
        ? { connect: { id: props.body.parentId } }
        : undefined,
    } satisfies Prisma.reddit_like_commentsCreateInput;
  }
}

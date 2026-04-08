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
    redditLikeMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      content: props.body.content,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: { connect: { id: props.redditLikePosts.id } },
      member: { connect: { id: props.redditLikeMembers.id } },
      parent: props.body.parentId
        ? { connect: { id: props.body.parentId } }
        : undefined,
      replies: undefined,
      votes: undefined,
      reports: undefined,
    } satisfies Prisma.reddit_like_commentsCreateInput;
  }
}

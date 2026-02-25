import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneContentCommentCollector {
  export async function collect(props: {
    body: IRedditCloneContentComment.ICreate;
    redditCloneMembers: IEntity;
  }) {
    // Query post to get its ID
    const post =
      await MyGlobal.prisma.reddit_clone_content_posts.findFirstOrThrow({
        where: { id: props.body.postId! },
      });
    return {
      id: v4(),
      content: props.body.content,
      vote_score: 0,
      reply_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.redditCloneMembers.id } },
      parentComment: props.body.parentId
        ? { connect: { id: props.body.parentId } }
        : undefined,
      post: { connect: { id: post.id } },
    } satisfies Prisma.reddit_clone_content_commentsCreateInput;
  }
}

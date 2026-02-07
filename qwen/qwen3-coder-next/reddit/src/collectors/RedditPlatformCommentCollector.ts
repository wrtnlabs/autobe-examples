import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformCommentCollector {
  export async function collect(props: {
    body: IRedditPlatformComment.ICreate;
    redditPlatformPosts: IEntity;
    redditPlatformUsers: IEntity;
    redditPlatformUserSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      content: "",
      vote_score: 0,
      comment_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      author: { connect: { id: props.redditPlatformUsers.id } },
      post: { connect: { id: props.redditPlatformPosts.id } },
      parentComment: undefined,
    } satisfies Prisma.reddit_platform_commentsCreateInput;
  }
}

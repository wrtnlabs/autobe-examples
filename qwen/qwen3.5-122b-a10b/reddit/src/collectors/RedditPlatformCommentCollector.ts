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
    redditPlatformMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      body: props.body.body,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: { connect: { id: props.redditPlatformPosts.id } },
      author: { connect: { id: props.redditPlatformMembers.id } },
      parent: props.body.parent_comment_id
        ? { connect: { id: props.body.parent_comment_id } }
        : undefined,
      replies: undefined,
      votes: undefined,
      editHistories: undefined,
      reports: undefined,
    } satisfies Prisma.reddit_platform_commentsCreateInput;
  }
}

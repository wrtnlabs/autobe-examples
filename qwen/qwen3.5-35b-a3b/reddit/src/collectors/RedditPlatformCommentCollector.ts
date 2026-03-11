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
    redditPlatformMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      content: props.body.content,
      vote_score: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      author: { connect: { id: props.redditPlatformMembers.id } },
      post: props.body.postId
        ? { connect: { id: props.body.postId } }
        : undefined,
      parent: props.body.parentId
        ? { connect: { id: props.body.parentId } }
        : undefined,
      replies: undefined,
      votes: undefined,
      moderationAuditLogs: undefined,
    } satisfies Prisma.reddit_platform_commentsCreateInput;
  }
}

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommentCollector {
  export async function collect(props: {
    body: IRedditComment.ICreate;
    redditPosts: IEntity;
    redditComments?: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      content: props.body.content,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: { connect: { id: props.redditPosts.id } },
      parent: props.redditComments
        ? { connect: { id: props.redditComments.id } }
        : undefined,
      replies: undefined,
      votes: undefined,
      snapshots: undefined,
    } satisfies Prisma.reddit_commentsCreateInput;
  }
}

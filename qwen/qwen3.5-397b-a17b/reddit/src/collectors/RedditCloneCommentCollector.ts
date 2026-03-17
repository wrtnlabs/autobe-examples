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
    redditCloneMembers: IEntity;
    redditCloneMemberSessions: IEntity;
    redditClonePosts: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      body: props.body.body,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      member: { connect: { id: props.redditCloneMembers.id } },
      post: { connect: { id: props.redditClonePosts.id } },
      parent: props.body.parent_comment_id
        ? { connect: { id: props.body.parent_comment_id } }
        : undefined,
      // HasMany relations (not needed for create)
      children: undefined,
      snapshots: undefined,
      childCommentSnapshots: undefined,
      reports: undefined,
    } satisfies Prisma.reddit_clone_commentsCreateInput;
  }
}

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityCommentCollector {
  export async function collect(props: {
    body: IRedditCommunityComment.ICreate;
    redditCommunityMembers: IEntity;
    redditCommunityPosts: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      content: props.body.content,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      member: { connect: { id: props.redditCommunityMembers.id } },
      post: { connect: { id: props.redditCommunityPosts.id } },
      parentComment: props.body.parent_comment_id
        ? { connect: { id: props.body.parent_comment_id } }
        : undefined,
      // HasMany relations (cannot create in this collector)
      replies: undefined,
      reports: undefined,
      votes: undefined,
    } satisfies Prisma.reddit_community_commentsCreateInput;
  }
}

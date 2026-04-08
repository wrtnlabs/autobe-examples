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
      upvotes_count: 0,
      downvotes_count: 0,
      score: 0,
      comment_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: {
        connect: { id: props.body.reddit_platform_post_id },
      },
      author: {
        connect: { id: props.redditPlatformMembers.id },
      },
      parent: props.body.reddit_platform_comments_id
        ? { connect: { id: props.body.reddit_platform_comments_id } }
        : undefined,
      replies: undefined,
      snapshots: undefined,
      votes: undefined,
    } satisfies Prisma.reddit_platform_commentsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditPlatformCommentCollector {
//         export async function collect(props: {
//           body: IRedditPlatformComment.ICreate;
//           redditPlatformMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       content: ...,
//       upvotes_count: ...,
//       downvotes_count: ...,
//       score: ...,
//       comment_count: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       post: ...,
//       author: ...,
//       parent: ...,
//       replies: ...,
//       snapshots: ...,
//       votes: ...,
//           } satisfies Prisma.reddit_platform_commentsCreateInput;
//         }
//       }
//--------------------------------------------------------------
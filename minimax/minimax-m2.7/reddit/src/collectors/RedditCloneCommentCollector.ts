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
    redditClonePosts: IEntity;
    redditCloneMembers: IEntity;
    redditCloneMemberSessions: IEntity;
  }) {
    return {
      // Scalar fields
      id: v4(),
      content: props.body.content,
      vote_score: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      post: { connect: { id: props.redditClonePosts.id } },
      member: { connect: { id: props.redditCloneMembers.id } },
      // Optional BelongsTo - use undefined, NOT null
      parent: props.body.parentCommentId
        ? { connect: { id: props.body.parentCommentId } }
        : undefined,
    } satisfies Prisma.reddit_clone_commentsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditCloneCommentCollector {
//         export async function collect(props: {
//           body: IRedditCloneComment.ICreate;
//           redditClonePosts: IEntity; // from path parameter postId
// redditCloneMembers: IEntity; // from authorized actor
// redditCloneMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       content: ...,
//       vote_score: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       post: ...,
//       member: ...,
//       parent: ...,
//       replies: ...,
//           } satisfies Prisma.reddit_clone_commentsCreateInput;
//         }
//       }
//--------------------------------------------------------------
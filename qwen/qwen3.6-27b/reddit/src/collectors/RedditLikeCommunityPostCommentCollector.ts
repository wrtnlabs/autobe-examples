import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeCommunityPostCommentCollector {
  export async function collect(props: {
    body: IRedditLikeCommunityPostComment.ICreate;
    redditLikeCommunityPosts: IEntity;
    redditLikeCommunityMembers: IEntity;
  }) {
    const id = v4();
    return {
      // Scalar fields
      id,
      body: props.body.body,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations (use connect, NOT direct FK)
      post: { connect: { id: props.redditLikeCommunityPosts.id } },
      authorMember: { connect: { id: props.redditLikeCommunityMembers.id } },
      // Optional BelongsTo (nullable FK - use undefined, NOT null)
      parentComment: props.body.parentCommentId
        ? { connect: { id: props.body.parentCommentId } }
        : undefined,
      // HasMany reverse relation - omitted (cannot create children during creation)
    } satisfies Prisma.reddit_like_community_post_commentsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditLikeCommunityPostCommentCollector {
//         export async function collect(props: {
//           body: IRedditLikeCommunityPostComment.ICreate;
//           redditLikeCommunityPosts: IEntity; // from path parameter postId
// redditLikeCommunityMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       created_at: ...,
//       deleted_at: ...,
//       body: ...,
//       updated_at: ...,
//       parentComment: ...,
//       authorMember: ...,
//       post: ...,
//       childComments: ...,
//           } satisfies Prisma.reddit_like_community_post_commentsCreateInput;
//         }
//       }
//--------------------------------------------------------------
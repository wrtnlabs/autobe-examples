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
    redditCommunityPosts: IEntity;
    redditCommunityMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      content: props.body.content,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: { connect: { id: props.redditCommunityPosts.id } },
      author: { connect: { id: props.redditCommunityMembers.id } },
      parent: props.body.redditCommunityCommentId
        ? { connect: { id: props.body.redditCommunityCommentId } }
        : undefined,
    } satisfies Prisma.reddit_community_commentsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditCommunityCommentCollector {
//         export async function collect(props: {
//           body: IRedditCommunityComment.ICreate;
//           redditCommunityPosts: IEntity; // from path parameter postId
// redditCommunityMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       content: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       post: ...,
//       author: ...,
//       parent: ...,
//       replies: ...,
//       votes: ...,
//       redditCommunityCommentReports: ...,
//       redditCommentReports: ...,
//           } satisfies Prisma.reddit_community_commentsCreateInput;
//         }
//       }
//--------------------------------------------------------------
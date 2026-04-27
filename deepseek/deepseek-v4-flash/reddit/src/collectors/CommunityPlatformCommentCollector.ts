import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommentCollector {
  export async function collect(props: {
    body: ICommunityPlatformComment.ICreate;
    communityPlatformMembers: IEntity;
    communityPlatformMemberSessions: IEntity;
    communityPlatformPosts: IEntity;
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
      author: { connect: { id: props.communityPlatformMembers.id } },
      post: { connect: { id: props.communityPlatformPosts.id } },
      // Optional parent comment (threaded reply)
      parentComment: props.body.commentId
        ? { connect: { id: props.body.commentId } }
        : undefined,
    } satisfies Prisma.community_platform_commentsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace CommunityPlatformCommentCollector {
//         export async function collect(props: {
//           body: ICommunityPlatformComment.ICreate;
//           communityPlatformMembers: IEntity; // from authorized actor
// communityPlatformMemberSessions: IEntity; // from authorized session
// communityPlatformPosts: IEntity; // from path parameter postId
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
//       author: ...,
//       post: ...,
//       parentComment: ...,
//       reports: ...,
//       replies: ...,
//       votes: ...,
//       reportTargets: ...,
//           } satisfies Prisma.community_platform_commentsCreateInput;
//         }
//       }
//--------------------------------------------------------------
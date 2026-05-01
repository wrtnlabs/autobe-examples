import { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityHubCommentCollector {
  export async function collect(props: {
    body: ICommunityHubComment.ICreate;
    communityHubPosts: IEntity;
    communityHubComments: IEntity;
    communityHubMembers: IEntity;
    communityHubMemberSessions: IEntity;
  }) {
    const id: string = v4();
    const parent = props.communityHubComments
      ? await MyGlobal.prisma.community_hub_comments.findFirstOrThrow({
          where: { id: props.communityHubComments.id },
        })
      : null;
    return {
      id,
      content: props.body.content,
      depth: parent ? parent.depth + 1 : 0,
      vote_score: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: parent
        ? { connect: { id: parent.community_hub_post_id } }
        : { connect: { id: props.communityHubPosts.id } },
      author: { connect: { id: props.communityHubMembers.id } },
      parentComment: props.communityHubComments
        ? { connect: { id: props.communityHubComments.id } }
        : undefined,
      childComments: undefined,
    } satisfies Prisma.community_hub_commentsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace CommunityHubCommentCollector {
//         export async function collect(props: {
//           body: ICommunityHubComment.ICreate;
//           communityHubPosts: IEntity; // from path parameter postId
// communityHubComments: IEntity; // from path parameter commentId
// communityHubMembers: IEntity; // from authorized actor
// communityHubMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       content: ...,
//       depth: ...,
//       vote_score: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       post: ...,
//       author: ...,
//       parentComment: ...,
//       childComments: ...,
//           } satisfies Prisma.community_hub_commentsCreateInput;
//         }
//       }
//--------------------------------------------------------------
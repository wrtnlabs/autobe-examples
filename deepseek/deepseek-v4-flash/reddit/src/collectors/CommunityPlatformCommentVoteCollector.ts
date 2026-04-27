import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommentVoteCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommentVote.ICreate;
    communityPlatformMembers: IEntity;
    communityPlatformMemberSessions: IEntity;
    communityPlatformComments: IEntity;
  }) {
    return {
      id: v4(),
      value: props.body.value,
      created_at: new Date(),
      updated_at: new Date(),
      voter: { connect: { id: props.communityPlatformMembers.id } },
      comment: { connect: { id: props.communityPlatformComments.id } },
    } satisfies Prisma.community_platform_comment_votesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace CommunityPlatformCommentVoteCollector {
//         export async function collect(props: {
//           body: ICommunityPlatformCommentVote.ICreate;
//           communityPlatformMembers: IEntity; // from authorized actor
// communityPlatformMemberSessions: IEntity; // from authorized session
// communityPlatformComments: IEntity; // from path parameter commentId
//           
//           
//         }) {
//           return {
//       id: ...,
//       value: ...,
//       created_at: ...,
//       updated_at: ...,
//       voter: ...,
//       comment: ...,
//           } satisfies Prisma.community_platform_comment_votesCreateInput;
//         }
//       }
//--------------------------------------------------------------
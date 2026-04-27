import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformVoteCollector {
  export async function collect(props: {
    body: ICommunityPlatformVote.ICreate;
    communityPlatformMembers: IEntity;
    communityPlatformMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      target_type: props.body.target_type,
      target_id: props.body.target_id,
      value: props.body.value,
      created_at: new Date(),
      updated_at: new Date(),
      voter: { connect: { id: props.communityPlatformMembers.id } },
    } satisfies Prisma.community_platform_votesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace CommunityPlatformVoteCollector {
//         export async function collect(props: {
//           body: ICommunityPlatformVote.ICreate;
//           communityPlatformMembers: IEntity; // from authorized actor
// communityPlatformMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       target_type: ...,
//       target_id: ...,
//       value: ...,
//       created_at: ...,
//       updated_at: ...,
//       voter: ...,
//           } satisfies Prisma.community_platform_votesCreateInput;
//         }
//       }
//--------------------------------------------------------------
import { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityHubVoteCollector {
  export async function collect(props: {
    body: ICommunityHubVote.ICreate;
    communityHubMembers: IEntity;
    communityHubMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      target_type: props.body.target_type,
      target_id: props.body.target_id,
      value: props.body.value,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.communityHubMembers.id } },
    } satisfies Prisma.community_hub_votesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace CommunityHubVoteCollector {
//         export async function collect(props: {
//           body: ICommunityHubVote.ICreate;
//           communityHubMembers: IEntity; // from authorized actor
// communityHubMemberSessions: IEntity; // from authorized session
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
//       member: ...,
//           } satisfies Prisma.community_hub_votesCreateInput;
//         }
//       }
//--------------------------------------------------------------
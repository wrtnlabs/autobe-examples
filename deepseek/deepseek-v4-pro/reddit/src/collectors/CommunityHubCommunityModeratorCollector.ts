import { ICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityHubCommunityModeratorCollector {
  export async function collect(props: {
    body: ICommunityHubCommunityModerator.ICreate;
    communityHubCommunities: IEntity;
    communityHubMembers: IEntity;
    communityHubMemberSessions: IEntity;
  }) {
    const targetMember =
      await MyGlobal.prisma.community_hub_members.findFirstOrThrow({
        where: {
          username: props.body.username,
          deleted_at: null,
        },
      });
    return {
      id: v4(),
      role: "moderator",
      created_at: new Date(),
      community: { connect: { id: props.communityHubCommunities.id } },
      member: { connect: { id: targetMember.id } },
      addedByMember: { connect: { id: props.communityHubMembers.id } },
    } satisfies Prisma.community_hub_community_moderatorsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace CommunityHubCommunityModeratorCollector {
//         export async function collect(props: {
//           body: ICommunityHubCommunityModerator.ICreate;
//           communityHubCommunities: IEntity; // from path parameter communityName
// communityHubMembers: IEntity; // from authorized actor
// communityHubMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       role: ...,
//       created_at: ...,
//       community: ...,
//       member: ...,
//       addedByMember: ...,
//           } satisfies Prisma.community_hub_community_moderatorsCreateInput;
//         }
//       }
//--------------------------------------------------------------
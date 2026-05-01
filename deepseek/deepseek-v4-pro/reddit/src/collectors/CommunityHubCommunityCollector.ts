import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityHubCommunityCollector {
  export async function collect(props: {
    body: ICommunityHubCommunity.ICreate;
    communityHubMembers: IEntity;
    communityHubMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      icon_image: props.body.icon_image ?? null,
      subscriber_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      owner: { connect: { id: props.communityHubMembers.id } },
    } satisfies Prisma.community_hub_communitiesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace CommunityHubCommunityCollector {
//         export async function collect(props: {
//           body: ICommunityHubCommunity.ICreate;
//           communityHubMembers: IEntity; // from authorized actor
// communityHubMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       description: ...,
//       icon_image: ...,
//       subscriber_count: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       owner: ...,
//       subscriptions: ...,
//       moderatorRoles: ...,
//       bans: ...,
//       posts: ...,
//       reports: ...,
//           } satisfies Prisma.community_hub_communitiesCreateInput;
//         }
//       }
//--------------------------------------------------------------
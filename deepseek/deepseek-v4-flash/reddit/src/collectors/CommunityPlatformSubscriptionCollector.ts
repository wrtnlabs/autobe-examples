import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformSubscriptionCollector {
  export async function collect(props: {
    body: ICommunityPlatformSubscription.ICreate;
    communityPlatformMembers: IEntity;
    communityPlatformMemberSessions: IEntity;
    communityPlatformCommunities: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.communityPlatformMembers.id } },
      community: { connect: { id: props.communityPlatformCommunities.id } },
    } satisfies Prisma.community_platform_subscriptionsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace CommunityPlatformSubscriptionCollector {
//         export async function collect(props: {
//           body: ICommunityPlatformSubscription.ICreate;
//           communityPlatformMembers: IEntity; // from authorized actor
// communityPlatformMemberSessions: IEntity; // from authorized session
// communityPlatformCommunities: IEntity; // from path parameter communityId
//           
//           
//         }) {
//           return {
//       id: ...,
//       created_at: ...,
//       updated_at: ...,
//       member: ...,
//       community: ...,
//           } satisfies Prisma.community_platform_subscriptionsCreateInput;
//         }
//       }
//--------------------------------------------------------------
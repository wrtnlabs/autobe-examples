import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformBanCollector {
  export async function collect(props: {
    body: ICommunityPlatformBan.ICreate;
    communityPlatformCommunities: IEntity;
    communityPlatformMembers: IEntity;
    communityPlatformMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      community: { connect: { id: props.communityPlatformCommunities.id } },
      bannedMember: { connect: { id: props.body.member_id } },
      bannedBy: { connect: { id: props.communityPlatformMembers.id } },
    } satisfies Prisma.community_platform_bansCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace CommunityPlatformBanCollector {
//         export async function collect(props: {
//           body: ICommunityPlatformBan.ICreate;
//           communityPlatformCommunities: IEntity; // from path parameter communityName
// communityPlatformMembers: IEntity; // from authorized actor
// communityPlatformMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       created_at: ...,
//       updated_at: ...,
//       community: ...,
//       bannedMember: ...,
//       bannedBy: ...,
//           } satisfies Prisma.community_platform_bansCreateInput;
//         }
//       }
//--------------------------------------------------------------
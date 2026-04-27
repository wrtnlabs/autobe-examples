import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunityBanCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunityBan.ICreate;
    communityPlatformMembers: IEntity;
    communityPlatformMemberSessions: IEntity;
  }) {
    const id: string = v4();
    // Resolve communityCode (unique name) to community ID
    const community =
      await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
        where: { name: props.body.communityCode },
        select: { id: true },
      });
    // Resolve memberCode (unique username) to member ID
    const bannedMember =
      await MyGlobal.prisma.community_platform_members.findFirstOrThrow({
        where: { username: props.body.memberCode },
        select: { id: true },
      });
    return {
      id,
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      expired_at: null,
      community: { connect: { id: community.id } },
      bannedMember: { connect: { id: bannedMember.id } },
      bannedBy: { connect: { id: props.communityPlatformMembers.id } },
    } satisfies Prisma.community_platform_community_bansCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace CommunityPlatformCommunityBanCollector {
//         export async function collect(props: {
//           body: ICommunityPlatformCommunityBan.ICreate;
//           communityPlatformMembers: IEntity; // from authorized actor
// communityPlatformMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       created_at: ...,
//       updated_at: ...,
//       expired_at: ...,
//       community: ...,
//       bannedMember: ...,
//       bannedBy: ...,
//           } satisfies Prisma.community_platform_community_bansCreateInput;
//         }
//       }
//--------------------------------------------------------------
import { ICommunityHubCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityHubCommunityBanCollector {
  export async function collect(props: {
    body: ICommunityHubCommunityBan.ICreate;
    communityHubCommunities: IEntity;
    communityHubMembers: IEntity;
  }) {
    const bannedMember =
      await MyGlobal.prisma.community_hub_members.findFirstOrThrow({
        where: { username: props.body.username },
      });
    return {
      id: v4(),
      reason: props.body.reason ?? null,
      unbanned_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      bannedMember: { connect: { id: bannedMember.id } },
      community: { connect: { id: props.communityHubCommunities.id } },
      issuedBy: { connect: { id: props.communityHubMembers.id } },
      unbannedBy: undefined,
    } satisfies Prisma.community_hub_community_bansCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace CommunityHubCommunityBanCollector {
//         export async function collect(props: {
//           body: ICommunityHubCommunityBan.ICreate;
//           communityHubCommunities: IEntity; // from path parameter communityName
// communityHubMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       unbanned_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       bannedMember: ...,
//       community: ...,
//       issuedBy: ...,
//       unbannedBy: ...,
//           } satisfies Prisma.community_hub_community_bansCreateInput;
//         }
//       }
//--------------------------------------------------------------
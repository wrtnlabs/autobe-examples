import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformModeratorCollector {
  export async function collect(props: {
    body: ICommunityPlatformModerator.ICreate;
    communityPlatformMembers: IEntity;
    communityPlatformMemberSessions: IEntity;
  }) {
    const community =
      await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
        where: { name: props.body.communityName },
      });
    const member =
      await MyGlobal.prisma.community_platform_members.findFirstOrThrow({
        where: { username: props.body.memberUsername },
      });
    const id = v4();
    return {
      id,
      role: "moderator",
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: member.id } },
      community: { connect: { id: community.id } },
      appointedBy: { connect: { id: props.communityPlatformMembers.id } },
    } satisfies Prisma.community_platform_moderatorsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace CommunityPlatformModeratorCollector {
//         export async function collect(props: {
//           body: ICommunityPlatformModerator.ICreate;
//           communityPlatformMembers: IEntity; // from authorized actor
// communityPlatformMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       role: ...,
//       created_at: ...,
//       updated_at: ...,
//       member: ...,
//       community: ...,
//       appointedBy: ...,
//           } satisfies Prisma.community_platform_moderatorsCreateInput;
//         }
//       }
//--------------------------------------------------------------
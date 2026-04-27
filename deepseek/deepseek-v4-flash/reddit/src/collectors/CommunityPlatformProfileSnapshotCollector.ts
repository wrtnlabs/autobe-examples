import { ICommunityPlatformProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformProfileSnapshotCollector {
  export async function collect(props: {
    body: ICommunityPlatformProfileSnapshot.ICreate;
    communityPlatformMembers: IEntity;
    communityPlatformProfiles: IEntity;
  }) {
    const id: string = v4();
    // Query current profile state for snapshot capture
    const profile =
      await MyGlobal.prisma.community_platform_profiles.findFirstOrThrow({
        where: { id: props.communityPlatformProfiles.id },
      });
    return {
      id,
      community_platform_member_id: props.communityPlatformMembers.id,
      display_name: profile.display_name,
      biography: profile.biography,
      avatar: profile.avatar_uri,
      karma: profile.karma,
      created_at: new Date(),
      profile: { connect: { id: props.communityPlatformProfiles.id } },
    } satisfies Prisma.community_platform_profile_snapshotsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace CommunityPlatformProfileSnapshotCollector {
//         export async function collect(props: {
//           body: ICommunityPlatformProfileSnapshot.ICreate;
//           communityPlatformMembers: IEntity; // from authorized actor
// communityPlatformProfiles: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       community_platform_member_id: ...,
//       display_name: ...,
//       biography: ...,
//       avatar: ...,
//       karma: ...,
//       created_at: ...,
//       profile: ...,
//           } satisfies Prisma.community_platform_profile_snapshotsCreateInput;
//         }
//       }
//--------------------------------------------------------------
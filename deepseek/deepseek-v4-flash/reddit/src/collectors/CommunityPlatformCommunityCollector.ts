import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { CommunityPlatformCommunityImageCollector } from "./CommunityPlatformCommunityImageCollector";

export namespace CommunityPlatformCommunityCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunity.ICreate;
    communityPlatformMembers: IEntity;
    communityPlatformMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description,
      subscriber_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      owner: { connect: { id: props.communityPlatformMembers.id } },
      images: props.body.images.length
        ? {
            create: await ArrayUtil.asyncMap(props.body.images, (image) =>
              CommunityPlatformCommunityImageCollector.collect({
                body: image,
                communityPlatformCommunities: { id },
              }),
            ),
          }
        : undefined,
    } satisfies Prisma.community_platform_communitiesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace CommunityPlatformCommunityCollector {
//         export async function collect(props: {
//           body: ICommunityPlatformCommunity.ICreate;
//           communityPlatformMembers: IEntity; // from authorized actor
// communityPlatformMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       description: ...,
//       subscriber_count: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       owner: ...,
//       images: ...,
//       communityModerators: ...,
//       communitySubscribers: ...,
//       communityBans: ...,
//       communityReports: ...,
//       snapshots: ...,
//       subscriptionSubscribers: ...,
//       posts: ...,
//       memberModerators: ...,
//       memberBans: ...,
//       reports: ...,
//           } satisfies Prisma.community_platform_communitiesCreateInput;
//         }
//       }
//--------------------------------------------------------------
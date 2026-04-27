import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunityImageCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunityImage.ICreate;
    communityPlatformCommunities: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      mime_type: props.body.mime_type,
      size: props.body.size,
      url: props.body.url,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.communityPlatformCommunities.id } },
    } satisfies Prisma.community_platform_community_imagesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace CommunityPlatformCommunityImageCollector {
//         export async function collect(props: {
//           body: ICommunityPlatformCommunityImage.ICreate;
//           communityPlatformCommunities: IEntity; // from path parameter communityId
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       mime_type: ...,
//       size: ...,
//       url: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       community: ...,
//           } satisfies Prisma.community_platform_community_imagesCreateInput;
//         }
//       }
//--------------------------------------------------------------
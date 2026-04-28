import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityProfileImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfileImage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace REdditLikeCommunityProfileImageCollector {
  export async function collect(props: {
    body: IREdditLikeCommunityProfileImage.ICreate;
    redditLikeCommunityProfiles: IEntity;
    redditLikeCommunityMembers: IEntity;
    options: {
      fileMetadata: {
        key: string;
        contentType: string;
        fileSize: number;
        width: number;
        height: number;
      };
    };
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      file_key: props.options.fileMetadata.key,
      content_type: props.options.fileMetadata.contentType,
      file_size: props.options.fileMetadata.fileSize,
      width: props.options.fileMetadata.width,
      height: props.options.fileMetadata.height,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations
      profile: { connect: { id: props.redditLikeCommunityProfiles.id } },
    } satisfies Prisma.reddit_like_community_profile_imagesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace REdditLikeCommunityProfileImageCollector {
//         export async function collect(props: {
//           body: IREdditLikeCommunityProfileImage.ICreate;
//           redditLikeCommunityProfiles: IEntity; // from path parameter profileId
// redditLikeCommunityMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       file_key: ...,
//       content_type: ...,
//       file_size: ...,
//       width: ...,
//       height: ...,
//       is_active: ...,
//       created_at: ...,
//       updated_at: ...,
//       profile: ...,
//           } satisfies Prisma.reddit_like_community_profile_imagesCreateInput;
//         }
//       }
//--------------------------------------------------------------
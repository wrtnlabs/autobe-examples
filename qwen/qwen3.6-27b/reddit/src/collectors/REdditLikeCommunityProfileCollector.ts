import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import { IREdditLikeCommunityProfileImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfileImage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { REdditLikeCommunityProfileImageCollector } from "./REdditLikeCommunityProfileImageCollector";

export namespace REdditLikeCommunityProfileCollector {
  export async function collect(props: {
    body: IREdditLikeCommunityProfile.ICreate;
    redditLikeCommunityMembers: IEntity;
    options?: {
      fileMetadata?: {
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
      display_name: props.body.display_name ?? null,
      bio: props.body.bio ?? null,
      karma: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      member: { connect: { id: props.redditLikeCommunityMembers.id } },
      // HasMany relations
      profileImages: props.body.avatar
        ? {
            create: await REdditLikeCommunityProfileImageCollector.collect({
              body: props.body.avatar,
              redditLikeCommunityProfiles: { id } as IEntity,
              redditLikeCommunityMembers: props.redditLikeCommunityMembers,
              options: {
                fileMetadata: props.options?.fileMetadata!,
              },
            }),
          }
        : undefined,
    } satisfies Prisma.reddit_like_community_profilesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace REdditLikeCommunityProfileCollector {
//         export async function collect(props: {
//           body: IREdditLikeCommunityProfile.ICreate;
//           redditLikeCommunityMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       display_name: ...,
//       bio: ...,
//       karma: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       member: ...,
//       profileImages: ...,
//           } satisfies Prisma.reddit_like_community_profilesCreateInput;
//         }
//       }
//--------------------------------------------------------------
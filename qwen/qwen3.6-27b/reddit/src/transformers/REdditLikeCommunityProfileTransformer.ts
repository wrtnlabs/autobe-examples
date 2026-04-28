import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import { IREdditLikeCommunityProfileImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfileImage";
import { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityMemberAtSummaryTransformer } from "./REdditLikeCommunityMemberAtSummaryTransformer";
import { REdditLikeCommunityProfileImageTransformer } from "./REdditLikeCommunityProfileImageTransformer";

export namespace REdditLikeCommunityProfileTransformer {
  export type Payload = Prisma.reddit_like_community_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        bio: true,
        karma: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
        profileImages: REdditLikeCommunityProfileImageTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IREdditLikeCommunityProfile> {
    const activeImage = input.profileImages.find(
      (img) => img.is_active === true,
    );
    return {
      id: input.id,
      display_name: input.display_name,
      bio: input.bio,
      karma: input.karma,
      member: await REdditLikeCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      activeAvatar: activeImage
        ? await REdditLikeCommunityProfileImageTransformer.transform(
            activeImage,
          )
        : null,
      posts: [],
      comments: [],
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at != null ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IREdditLikeCommunityProfile;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace REdditLikeCommunityProfileTransformer {
//       export type Payload = Prisma.reddit_like_community_profilesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             display_name: true,
//             bio: true,
//             karma: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
//             profileImages: REdditLikeCommunityProfileImageTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.reddit_like_community_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IREdditLikeCommunityProfile> {
//         return {
//   id: {string},
//   display_name: {string | null},
//   bio: {string | null},
//   karma: {integer},
//   member: await REdditLikeCommunityMemberAtSummaryTransformer.transform(input.member),
//   activeAvatar: input.profileImages ? await REdditLikeCommunityProfileImageTransformer.transform(input.profileImages) : null,
//   posts: {Array<IREdditLikeCommunityPost.ISummary>},
//   comments: {Array<IRedditLikeCommunityPostComment.ISummary>},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------
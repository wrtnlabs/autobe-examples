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
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { REdditLikeCommunityProfileTransformer } from "../transformers/REdditLikeCommunityProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeCommunityMemberProfile(props: {
  member: MemberPayload;
  body: IREdditLikeCommunityProfile.IUpdate;
}): Promise<IREdditLikeCommunityProfile> {
  // Validate display_name must be non-empty and not whitespace-only if provided and not null
  if (
    props.body.display_name !== undefined &&
    props.body.display_name !== null &&
    props.body.display_name.trim().length === 0
  ) {
    throw new HttpException(
      "Display name cannot be empty or whitespace-only",
      400,
    );
  }
  // Handle avatar_url updates: find the member's profile for image lookups
  if (props.body.avatar_url !== undefined) {
    if (props.body.avatar_url === null) {
      // Clear active avatar — deactivate all active images for this profile
      await MyGlobal.prisma.reddit_like_community_profile_images.updateMany({
        where: {
          profile: {
            member: {
              id: props.member.id,
            },
          },
          is_active: true,
        },
        data: { is_active: false, updated_at: new Date() },
      });
    } else {
      // Deactivate all current active images first to satisfy unique constraint
      await MyGlobal.prisma.reddit_like_community_profile_images.updateMany({
        where: {
          profile: {
            member: {
              id: props.member.id,
            },
          },
          is_active: true,
        },
        data: { is_active: false, updated_at: new Date() },
      });
      // Find the matching image by file_key
      const profileImage =
        await MyGlobal.prisma.reddit_like_community_profile_images.findFirst({
          where: {
            profile: {
              member: {
                id: props.member.id,
              },
            },
            file_key: props.body.avatar_url,
          },
        });
      if (profileImage === null) {
        throw new HttpException("Avatar image not found for this profile", 404);
      }
      // Activate the selected image
      await MyGlobal.prisma.reddit_like_community_profile_images.update({
        where: { id: profileImage.id },
        data: { is_active: true, updated_at: new Date() },
      });
    }
  }
  // Build the profile update data
  const updateData: Record<string, unknown> = {
    updated_at: new Date(),
  };
  if (props.body.display_name !== undefined) {
    updateData.display_name = props.body.display_name;
  }
  if (props.body.bio !== undefined) {
    updateData.bio = props.body.bio;
  }
  // Update the profile owned by the authenticated member
  await MyGlobal.prisma.reddit_like_community_profiles.update({
    where: { reddit_like_community_member_id: props.member.id },
    data: updateData,
  });
  // Fetch fully transformed profile for response
  const updated =
    await MyGlobal.prisma.reddit_like_community_profiles.findUniqueOrThrow({
      where: { reddit_like_community_member_id: props.member.id },
      ...REdditLikeCommunityProfileTransformer.select(),
    });
  return await REdditLikeCommunityProfileTransformer.transform(updated);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IREdditLikeCommunityProfileImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfileImage";
// import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// import { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditLikeCommunityMemberProfile(props: {
//   member: MemberPayload;
//   body: IREdditLikeCommunityProfile.IUpdate;
// }): Promise<IREdditLikeCommunityProfile> {
//   await MyGlobal.prisma.reddit_like_community_profiles.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_like_community_profiles.findUniqueOrThrow({
//     where: { ... },
//     ...REdditLikeCommunityProfileTransformer.select(),
//   });
//   return await REdditLikeCommunityProfileTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------
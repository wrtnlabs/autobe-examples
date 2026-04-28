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

export async function putRedditLikeCommunityMemberCommunityProfilesProfileId(props: {
  member: MemberPayload;
  profileId: string & tags.Format<"uuid">;
  body: IREdditLikeCommunityProfile.IUpdate;
}): Promise<IREdditLikeCommunityProfile> {
  const profile =
    await MyGlobal.prisma.reddit_like_community_profiles.findUniqueOrThrow({
      where: { id: props.profileId },
      select: {
        reddit_like_community_member_id: true,
      },
    });
  if (profile.reddit_like_community_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.avatar_url !== undefined && props.body.avatar_url !== null) {
    const targetImage =
      await MyGlobal.prisma.reddit_like_community_profile_images.findFirst({
        where: {
          reddit_like_community_profile_id: props.profileId,
          file_key: props.body.avatar_url,
        },
        select: {
          id: true,
        },
      });
    if (targetImage === null) {
      throw new HttpException("Profile image not found", 404);
    }
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.reddit_like_community_profile_images.updateMany({
        where: {
          reddit_like_community_profile_id: props.profileId,
          is_active: true,
        },
        data: {
          is_active: false,
        },
      }),
      MyGlobal.prisma.reddit_like_community_profile_images.update({
        where: { id: targetImage.id },
        data: {
          is_active: true,
        },
      }),
    ]);
  }
  await MyGlobal.prisma.reddit_like_community_profiles.update({
    where: { id: props.profileId },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(props.body.bio !== undefined && { bio: props.body.bio }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.reddit_like_community_profiles.findUniqueOrThrow({
      where: { id: props.profileId },
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
// export async function putRedditLikeCommunityMemberCommunityProfilesProfileId(props: {
//   member: MemberPayload;
//   profileId: string & tags.Format<"uuid">;
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
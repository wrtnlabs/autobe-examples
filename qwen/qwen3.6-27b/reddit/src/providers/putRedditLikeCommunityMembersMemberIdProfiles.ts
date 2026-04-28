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
import { REdditLikeCommunityProfileTransformer } from "../transformers/REdditLikeCommunityProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeCommunityMembersMemberIdProfiles(props: {
  memberId: string & tags.Format<"uuid">;
  body: IREdditLikeCommunityProfile.IUpdate;
}): Promise<IREdditLikeCommunityProfile> {
  const { memberId } = props;
  const member = await MyGlobal.prisma.reddit_like_community_members.findUnique(
    {
      where: { id: memberId },
      select: { id: true, deleted_at: true },
    },
  );
  if (!member || member.deleted_at !== null) {
    throw new HttpException("Not found", 404);
  }
  const profile =
    await MyGlobal.prisma.reddit_like_community_profiles.findUnique({
      where: { reddit_like_community_member_id: memberId },
      select: { id: true },
    });
  if (!profile) {
    throw new HttpException("Not found", 404);
  }
  const { display_name, bio, avatar_url } = props.body;
  if (avatar_url !== undefined) {
    if (avatar_url === null) {
      await MyGlobal.prisma.reddit_like_community_profile_images.updateMany({
        where: {
          reddit_like_community_profile_id: profile.id,
          is_active: true,
        },
        data: { is_active: false },
      });
    } else {
      await MyGlobal.prisma.reddit_like_community_profile_images.updateMany({
        where: {
          reddit_like_community_profile_id: profile.id,
          is_active: true,
        },
        data: { is_active: false },
      });
      const targetImage =
        await MyGlobal.prisma.reddit_like_community_profile_images.findFirst({
          where: {
            reddit_like_community_profile_id: profile.id,
            file_key: avatar_url,
          },
        });
      if (!targetImage) {
        throw new HttpException("Avatar image not found", 404);
      }
      await MyGlobal.prisma.reddit_like_community_profile_images.update({
        where: { id: targetImage.id },
        data: { is_active: true },
      });
    }
  }
  await MyGlobal.prisma.reddit_like_community_profiles.update({
    where: { id: profile.id },
    data: {
      ...(display_name !== undefined && { display_name }),
      ...(bio !== undefined && { bio }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.reddit_like_community_profiles.findUniqueOrThrow({
      where: { id: profile.id },
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
// export async function putRedditLikeCommunityMembersMemberIdProfiles(props: {
//   memberId: string & tags.Format<"uuid">;
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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import { IREdditLikeCommunityProfileImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfileImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { REdditLikeCommunityProfileImageTransformer } from "../transformers/REdditLikeCommunityProfileImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeCommunityMemberProfilesProfileIdImages(props: {
  member: MemberPayload;
  profileId: string & tags.Format<"uuid">;
  body: IREdditLikeCommunityProfileImage.ICreate;
}): Promise<IREdditLikeCommunityProfileImage> {
  const profile =
    await MyGlobal.prisma.reddit_like_community_profiles.findUniqueOrThrow({
      where: { id: props.profileId },
      select: {
        id: true,
        reddit_like_community_member_id: true,
      },
    });
  if (profile.reddit_like_community_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_like_community_profile_images.updateMany({
    where: {
      reddit_like_community_profile_id: props.profileId,
      is_active: true,
    },
    data: { is_active: false },
  });
  const fileMeta = props.body as any as {
    key: string;
    contentType: string;
    fileSize: number;
    width: number;
    height: number;
  };
  const record =
    await MyGlobal.prisma.reddit_like_community_profile_images.create({
      data: {
        id: v4(),
        file_key: fileMeta.key,
        content_type: fileMeta.contentType,
        file_size: fileMeta.fileSize,
        width: fileMeta.width,
        height: fileMeta.height,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        profile: { connect: { id: props.profileId } },
      },
      ...REdditLikeCommunityProfileImageTransformer.select(),
    });
  return await REdditLikeCommunityProfileImageTransformer.transform(record);
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
// import { IREdditLikeCommunityProfileImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfileImage";
// import { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditLikeCommunityMemberProfilesProfileIdImages(props: {
//   member: MemberPayload;
//   profileId: string & tags.Format<"uuid">;
//   body: IREdditLikeCommunityProfileImage.ICreate;
// }): Promise<IREdditLikeCommunityProfileImage> {
//   const record = await MyGlobal.prisma.reddit_like_community_profile_images.create({
//     data: await REdditLikeCommunityProfileImageCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...REdditLikeCommunityProfileImageTransformer.select(),
//   });
//   return await REdditLikeCommunityProfileImageTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
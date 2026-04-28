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
import { REdditLikeCommunityProfileImageTransformer } from "../transformers/REdditLikeCommunityProfileImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeCommunityProfilesProfileIdImagesImageId(props: {
  profileId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IREdditLikeCommunityProfileImage> {
  const record =
    await MyGlobal.prisma.reddit_like_community_profile_images.findFirstOrThrow(
      {
        ...REdditLikeCommunityProfileImageTransformer.select(),
        where: {
          id: props.imageId,
          reddit_like_community_profile_id: props.profileId,
        },
      },
    );
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
// export async function getRedditLikeCommunityProfilesProfileIdImagesImageId(props: {
//   profileId: string & tags.Format<"uuid">;
//   imageId: string & tags.Format<"uuid">;
// }): Promise<IREdditLikeCommunityProfileImage> {
//   const record = await MyGlobal.prisma.reddit_like_community_profile_images.findFirstOrThrow({
//     ...REdditLikeCommunityProfileImageTransformer.select(),
//     where: { ... },
//   });
//   return await REdditLikeCommunityProfileImageTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
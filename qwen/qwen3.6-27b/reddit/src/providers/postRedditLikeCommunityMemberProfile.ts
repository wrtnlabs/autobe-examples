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
import { REdditLikeCommunityProfileCollector } from "../collectors/REdditLikeCommunityProfileCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { REdditLikeCommunityProfileTransformer } from "../transformers/REdditLikeCommunityProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeCommunityMemberProfile(props: {
  member: MemberPayload;
  body: IREdditLikeCommunityProfile.ICreate;
}): Promise<IREdditLikeCommunityProfile> {
  const existing =
    await MyGlobal.prisma.reddit_like_community_profiles.findFirst({
      where: {
        reddit_like_community_member_id: props.member.id,
      },
    });
  if (existing === null) {
    const record = await MyGlobal.prisma.reddit_like_community_profiles.create({
      data: await REdditLikeCommunityProfileCollector.collect({
        body: props.body,
        redditLikeCommunityMembers: {
          id: props.member.id,
        },
      }),
      ...REdditLikeCommunityProfileTransformer.select(),
    });
    return await REdditLikeCommunityProfileTransformer.transform(record);
  }
  if (props.body.display_name !== undefined || props.body.bio !== undefined) {
    await MyGlobal.prisma.reddit_like_community_profiles.update({
      where: { id: existing.id },
      data: {
        ...(props.body.display_name !== undefined && {
          display_name: props.body.display_name,
        }),
        ...(props.body.bio !== undefined && { bio: props.body.bio }),
        updated_at: new Date(),
      },
    });
  }
  const record =
    await MyGlobal.prisma.reddit_like_community_profiles.findUniqueOrThrow({
      where: { id: existing.id },
      ...REdditLikeCommunityProfileTransformer.select(),
    });
  return await REdditLikeCommunityProfileTransformer.transform(record);
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
// import { IREdditLikeCommunityProfileImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfileImage";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// import { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditLikeCommunityMemberProfile(props: {
//   member: MemberPayload;
//   body: IREdditLikeCommunityProfile.ICreate;
// }): Promise<IREdditLikeCommunityProfile> {
//   const record = await MyGlobal.prisma.reddit_like_community_profiles.create({
//     data: await REdditLikeCommunityProfileCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...REdditLikeCommunityProfileTransformer.select(),
//   });
//   return await REdditLikeCommunityProfileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
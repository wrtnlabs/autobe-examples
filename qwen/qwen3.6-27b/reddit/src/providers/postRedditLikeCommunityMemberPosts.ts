import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { REdditLikeCommunityPostCollector } from "../collectors/REdditLikeCommunityPostCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { REdditLikeCommunityPostTransformer } from "../transformers/REdditLikeCommunityPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeCommunityMemberPosts(props: {
  member: MemberPayload;
  body: IREdditLikeCommunityPost.ICreate;
}): Promise<IREdditLikeCommunityPost> {
  const subscription =
    await MyGlobal.prisma.reddit_like_community_community_subscriptions.findFirst(
      {
        where: {
          member_id: props.member.id,
          community_id: props.body.community_id,
          is_active: true,
          deleted_at: null,
        },
      },
    );
  if (subscription === null) {
    throw new HttpException(
      "You must be subscribed to this community to create posts",
      403,
    );
  }
  const record = await MyGlobal.prisma.reddit_like_community_posts.create({
    data: await REdditLikeCommunityPostCollector.collect({
      body: props.body,
      redditLikeCommunityMembers: { id: props.member.id },
    }),
    ...REdditLikeCommunityPostTransformer.select(),
  });
  return await REdditLikeCommunityPostTransformer.transform(record);
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
// import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
// import { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditLikeCommunityMemberPosts(props: {
//   member: MemberPayload;
//   body: IREdditLikeCommunityPost.ICreate;
// }): Promise<IREdditLikeCommunityPost> {
//   const record = await MyGlobal.prisma.reddit_like_community_posts.create({
//     data: await REdditLikeCommunityPostCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...REdditLikeCommunityPostTransformer.select(),
//   });
//   return await REdditLikeCommunityPostTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
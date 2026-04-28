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
import { REdditLikeCommunityMemberAtSummaryTransformer } from "../transformers/REdditLikeCommunityMemberAtSummaryTransformer";
import { REdditLikeCommunityPostAtSummaryTransformer } from "../transformers/REdditLikeCommunityPostAtSummaryTransformer";
import { REdditLikeCommunityProfileTransformer } from "../transformers/REdditLikeCommunityProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeCommunityProfilesProfileId(props: {
  profileId: string & tags.Format<"uuid">;
}): Promise<IREdditLikeCommunityProfile> {
  const profileRecord =
    await MyGlobal.prisma.reddit_like_community_profiles.findFirstOrThrow({
      ...REdditLikeCommunityProfileTransformer.select(),
      where: {
        id: props.profileId,
        deleted_at: null,
      },
    });
  const profile =
    await REdditLikeCommunityProfileTransformer.transform(profileRecord);
  const postsData = await MyGlobal.prisma.reddit_like_community_posts.findMany({
    where: {
      author_id: profile.member.id,
      deleted_at: null,
    },
    orderBy: {
      created_at: "desc",
    },
    ...REdditLikeCommunityPostAtSummaryTransformer.select(),
  });
  const postSummaries = await ArrayUtil.asyncMap(
    postsData,
    REdditLikeCommunityPostAtSummaryTransformer.transform,
  );
  const commentsData =
    await MyGlobal.prisma.reddit_like_community_post_comments.findMany({
      where: {
        reddit_like_community_member_id: profile.member.id,
        deleted_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        body: true,
        created_at: true,
      },
    });
  const commentSummaries = await ArrayUtil.asyncMap(
    commentsData,
    async (c) =>
      ({
        id: c.id,
        author: await REdditLikeCommunityMemberAtSummaryTransformer.transform(
          profileRecord.member,
        ),
        body: c.body,
        created_at: toISOStringSafe(c.created_at),
      }) satisfies IRedditLikeCommunityPostComment.ISummary,
  );
  return {
    ...profile,
    posts: postSummaries,
    comments: commentSummaries,
  };
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
// export async function getRedditLikeCommunityProfilesProfileId(props: {
//   profileId: string & tags.Format<"uuid">;
// }): Promise<IREdditLikeCommunityProfile> {
//   const record = await MyGlobal.prisma.reddit_like_community_profiles.findFirstOrThrow({
//     ...REdditLikeCommunityProfileTransformer.select(),
//     where: { ... },
//   });
//   return await REdditLikeCommunityProfileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
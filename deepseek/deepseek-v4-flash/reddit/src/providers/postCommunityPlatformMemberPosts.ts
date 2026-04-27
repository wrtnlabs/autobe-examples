import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostCollector } from "../collectors/CommunityPlatformPostCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostTransformer } from "../transformers/CommunityPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postCommunityPlatformMemberPosts(props: {
  member: MemberPayload;
  body: ICommunityPlatformPost.ICreate;
}): Promise<ICommunityPlatformPost> {
  // 1. Verify community exists and is active (not soft-deleted)
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.body.communityId, deleted_at: null },
      select: { id: true },
    });
  // 2. Verify member is subscribed to the community
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findUnique(
      {
        where: {
          member_id_community_id: {
            member_id: props.member.id,
            community_id: community.id,
          },
        },
      },
    );
  if (subscription === null) {
    throw new HttpException(
      "Subscription required to post in this community",
      403,
    );
  }
  // 3. Verify member is NOT actively banned from the community
  const activeBan =
    await MyGlobal.prisma.community_platform_community_bans.findFirst({
      where: {
        community_platform_community_id: community.id,
        community_platform_member_id: props.member.id,
        OR: [
          { expired_at: null },
          { expired_at: { gt: new Date().toISOString() } },
        ],
      },
      select: { id: true },
    });
  if (activeBan) {
    throw new HttpException("You are banned from this community", 403);
  }
  // 4. Create the post with type-specific content via collector
  const record = await MyGlobal.prisma.community_platform_posts.create({
    data: await CommunityPlatformPostCollector.collect({
      body: props.body,
      communityPlatformMembers: { id: props.member.id },
      communityPlatformMemberSessions: { id: props.member.session_id },
    }),
    ...CommunityPlatformPostTransformer.select(),
  });
  // 5. Return transformed response
  return await CommunityPlatformPostTransformer.transform(record);
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
// import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityPlatformMemberPosts(props: {
//   member: MemberPayload;
//   body: ICommunityPlatformPost.ICreate;
// }): Promise<ICommunityPlatformPost> {
//   const record = await MyGlobal.prisma.community_platform_posts.create({
//     data: await CommunityPlatformPostCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...CommunityPlatformPostTransformer.select(),
//   });
//   return await CommunityPlatformPostTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityImageCollector } from "../collectors/CommunityPlatformCommunityImageCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityImageTransformer } from "../transformers/CommunityPlatformCommunityImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommunitiesCommunityIdImages(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityImage.ICreate;
}): Promise<ICommunityPlatformCommunityImage> {
  // 1. Verify the community exists and is not soft-deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId, deleted_at: null },
      select: { id: true, owner_id: true },
    });
  // 2. Verify the requesting member is the community owner or an appointed moderator
  const isOwner: boolean = community.owner_id === props.member.id;
  if (isOwner === false) {
    const moderator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_platform_member_id: props.member.id,
          community_platform_community_id: props.communityId,
        },
        select: { id: true },
      });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 3. Soft-delete the previously active icon so the new one becomes current
  await MyGlobal.prisma.community_platform_community_images.updateMany({
    where: {
      community_platform_community_id: props.communityId,
      deleted_at: null,
    },
    data: { deleted_at: new Date() },
  });
  // 4. Create a new icon image record using the collector, and read back via transformer select
  const record =
    await MyGlobal.prisma.community_platform_community_images.create({
      data: await CommunityPlatformCommunityImageCollector.collect({
        body: props.body,
        communityPlatformCommunities: { id: props.communityId },
      }),
      ...CommunityPlatformCommunityImageTransformer.select(),
    });
  // 5. Transform and return the created record as ICommunityPlatformCommunityImage
  return await CommunityPlatformCommunityImageTransformer.transform(record);
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
// import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityPlatformMemberCommunitiesCommunityIdImages(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   body: ICommunityPlatformCommunityImage.ICreate;
// }): Promise<ICommunityPlatformCommunityImage> {
//   const record = await MyGlobal.prisma.community_platform_community_images.create({
//     data: await CommunityPlatformCommunityImageCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...CommunityPlatformCommunityImageTransformer.select(),
//   });
//   return await CommunityPlatformCommunityImageTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------
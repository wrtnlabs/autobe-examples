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
import { CommunityPlatformCommunityTransformer } from "../transformers/CommunityPlatformCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putCommunityPlatformMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunity.IUpdate;
}): Promise<ICommunityPlatformCommunity> {
  // 1. Fetch community and validate existence
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { id: props.communityId, deleted_at: null },
      select: { id: true, owner_id: true, name: true },
    });
  if (community === null) {
    throw new HttpException("Not Found", 404);
  }
  // 2. Validate ownership
  if (community.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate name uniqueness if changing
  if (props.body.name !== undefined && props.body.name !== community.name) {
    const existing =
      await MyGlobal.prisma.community_platform_communities.findUnique({
        where: { name: props.body.name },
        select: { id: true },
      });
    if (existing !== null) {
      throw new HttpException("Name already taken", 409);
    }
  }
  // 4. Build update data
  const updateData: Prisma.community_platform_communitiesUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  // 5. Perform update
  await MyGlobal.prisma.community_platform_communities.update({
    where: { id: props.communityId },
    data: updateData,
  });
  // 6. Handle icon creation if provided
  if (props.body.icon !== undefined) {
    await MyGlobal.prisma.community_platform_community_images.create({
      data: await CommunityPlatformCommunityImageCollector.collect({
        body: props.body.icon,
        communityPlatformCommunities: {
          id: props.communityId,
        } satisfies IEntity,
      }),
    });
  }
  // 7. Fetch updated community with full response
  const updated =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      ...CommunityPlatformCommunityTransformer.select(),
    });
  return await CommunityPlatformCommunityTransformer.transform(updated);
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
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putCommunityPlatformMemberCommunitiesCommunityId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   body: ICommunityPlatformCommunity.IUpdate;
// }): Promise<ICommunityPlatformCommunity> {
//   await MyGlobal.prisma.community_platform_communities.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
//     where: { ... },
//     ...CommunityPlatformCommunityTransformer.select(),
//   });
//   return await CommunityPlatformCommunityTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------
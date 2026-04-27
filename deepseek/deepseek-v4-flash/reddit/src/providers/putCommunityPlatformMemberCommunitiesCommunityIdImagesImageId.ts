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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityImageTransformer } from "../transformers/CommunityPlatformCommunityImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberCommunitiesCommunityIdImagesImageId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityImage.IUpdate;
}): Promise<ICommunityPlatformCommunityImage> {
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
    select: { id: true },
  });
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.member.id,
        community_id: props.communityId,
        role: { in: ["owner", "moderator"] },
      },
      select: { id: true },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.community_platform_community_images.findFirstOrThrow({
    where: {
      id: props.imageId,
      community_platform_community_id: props.communityId,
    },
    select: { id: true },
  });
  await MyGlobal.prisma.community_platform_community_images.update({
    where: { id: props.imageId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.mime_type !== undefined && {
        mime_type: props.body.mime_type,
      }),
      ...(props.body.size !== undefined && { size: props.body.size }),
      ...(props.body.url !== undefined && { url: props.body.url }),
      updated_at: new Date().toISOString(),
    } satisfies Prisma.community_platform_community_imagesUpdateInput,
  });
  const updated =
    await MyGlobal.prisma.community_platform_community_images.findUniqueOrThrow(
      {
        where: { id: props.imageId },
        ...CommunityPlatformCommunityImageTransformer.select(),
      },
    );
  return await CommunityPlatformCommunityImageTransformer.transform(updated);
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
// export async function putCommunityPlatformMemberCommunitiesCommunityIdImagesImageId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   imageId: string & tags.Format<"uuid">;
//   body: ICommunityPlatformCommunityImage.IUpdate;
// }): Promise<ICommunityPlatformCommunityImage> {
//   await MyGlobal.prisma.community_platform_community_images.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.community_platform_community_images.findUniqueOrThrow({
//     where: { ... },
//     ...CommunityPlatformCommunityImageTransformer.select(),
//   });
//   return await CommunityPlatformCommunityImageTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformMemberCommunitiesCommunityIdImagesImageId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify the community exists and is not soft-deleted
  await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
  });
  // Step 2: Verify the requesting member has moderation authority
  // (owner or moderator role in this community)
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.member.id,
        community_id: props.communityId,
        role: { in: ["owner", "moderator"] },
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Verify the icon image record exists and is not soft-deleted
  await MyGlobal.prisma.community_platform_community_images.findFirstOrThrow({
    where: {
      id: props.imageId,
      community_platform_community_id: props.communityId,
      deleted_at: null,
    },
  });
  // Step 4: Soft-delete the image record by setting deleted_at timestamp
  await MyGlobal.prisma.community_platform_community_images.update({
    where: { id: props.imageId },
    data: {
      deleted_at: new Date().toISOString(),
    },
  });
  // Step 5: Initiate asynchronous background job to delete the physical
  // image file at the stored URL from external storage.
  // TODO: Implement async file deletion job (out of scope for this provider)
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteCommunityPlatformMemberCommunitiesCommunityIdImagesImageId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   imageId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------
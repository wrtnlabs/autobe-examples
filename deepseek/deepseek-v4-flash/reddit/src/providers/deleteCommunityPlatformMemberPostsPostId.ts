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

export async function deleteCommunityPlatformMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      member_id: true,
      community_id: true,
      type: true,
      deleted_at: true,
    },
  });
  if (post === null || post.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const ban =
    await MyGlobal.prisma.community_platform_community_bans.findUnique({
      where: {
        community_platform_community_id_community_platform_member_id: {
          community_platform_community_id: post.community_id,
          community_platform_member_id: props.member.id,
        },
      },
      select: { expired_at: true },
    });
  if (
    ban !== null &&
    (ban.expired_at === null ||
      ban.expired_at.toISOString() > new Date().toISOString())
  ) {
    throw new HttpException("Forbidden", 403);
  }
  if (post.member_id !== props.member.id) {
    const community =
      await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
        where: { id: post.community_id },
        select: { owner_id: true },
      });
    if (community.owner_id !== props.member.id) {
      const moderator =
        await MyGlobal.prisma.community_platform_community_moderators.findUnique(
          {
            where: {
              community_platform_member_id_community_platform_community_id: {
                community_platform_member_id: props.member.id,
                community_platform_community_id: post.community_id,
              },
            },
            select: { id: true },
          },
        );
      if (moderator === null) {
        throw new HttpException("Forbidden", 403);
      }
    }
  }
  await MyGlobal.prisma.community_platform_posts.update({
    where: { id: props.postId },
    data: { deleted_at: new Date().toISOString() },
  });
  if (post.type === "image") {
    await MyGlobal.prisma.community_platform_post_images.updateMany({
      where: { community_platform_post_id: props.postId },
      data: { deleted_at: new Date().toISOString() },
    });
  }
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
// export async function deleteCommunityPlatformMemberPostsPostId(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------
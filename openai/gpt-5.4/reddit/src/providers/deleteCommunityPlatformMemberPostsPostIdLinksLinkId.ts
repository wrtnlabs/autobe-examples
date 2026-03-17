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

export async function deleteCommunityPlatformMemberPostsPostIdLinksLinkId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  linkId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_platform_member_id: true,
        community_platform_community_id: true,
      },
    },
  );
  const link =
    await MyGlobal.prisma.community_platform_post_links.findUniqueOrThrow({
      where: { id: props.linkId },
      select: {
        id: true,
        community_platform_post_id: true,
      },
    });
  if (link.community_platform_post_id !== post.id) {
    throw new HttpException("Link does not belong to the specified post", 400);
  }
  if (post.community_platform_member_id !== props.member.id) {
    const moderator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_platform_community_id: post.community_platform_community_id,
          community_platform_member_id: props.member.id,
          status: "active",
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const deleted = await tx.community_platform_post_links.deleteMany({
      where: {
        id: props.linkId,
        community_platform_post_id: props.postId,
      },
    });
    if (deleted.count === 0) {
      throw new HttpException("Link not found", 404);
    }
    await tx.community_platform_posts.delete({
      where: { id: props.postId },
    });
  });
}

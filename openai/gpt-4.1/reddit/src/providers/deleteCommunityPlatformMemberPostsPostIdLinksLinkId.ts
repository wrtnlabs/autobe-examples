import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteCommunityPlatformMemberPostsPostIdLinksLinkId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  linkId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch link, ensure it exists and belongs to the post
  const link = await MyGlobal.prisma.community_platform_post_links.findFirst({
    where: {
      id: props.linkId,
      community_platform_post_id: props.postId,
    },
  });
  if (!link) {
    throw new HttpException(
      "Post link not found for given postId and linkId",
      404,
    );
  }
  // Fetch parent post, check authorship and community
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: {
      id: props.postId,
    },
  });
  if (!post) {
    throw new HttpException("Parent post not found", 404);
  }
  // Is the requesting member the post creator?
  const isOwner = post.community_platform_member_id === props.member.id;
  let isModerator = false;
  // If not owner, check for moderator role in the post's community
  if (!isOwner) {
    const mod = await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.member.id,
        community_id: post.community_platform_community_id,
        status: "active",
        deleted_at: null,
      },
    });
    isModerator = !!mod;
  }
  if (!isOwner && !isModerator) {
    throw new HttpException(
      "You do not have permission to delete this link",
      403,
    );
  }
  // Delete the link (hard delete)
  await MyGlobal.prisma.community_platform_post_links.delete({
    where: { id: props.linkId },
  });
  // Optionally audit logging (not specified in DTO but required by operation description)
}

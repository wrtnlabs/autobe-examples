import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPlatformMemberPostsPostIdLinksLinkId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  linkId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostLink.IUpdate;
}): Promise<ICommunityPlatformPostLink> {
  const { member, postId, linkId, body } = props;

  // 1. Fetch the post link
  const link = await MyGlobal.prisma.community_platform_post_links.findUnique({
    where: { id: linkId },
  });
  if (!link || link.community_platform_post_id !== postId) {
    throw new HttpException("Post link not found", 404);
  }

  // 2. Fetch the parent post
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: postId },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // 3. Authorize: must be post author or moderator for the community
  const isAuthor = post.community_platform_member_id === member.id;
  let isModerator = false;
  if (!isAuthor) {
    const mod = await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: member.id,
        community_id: post.community_platform_community_id,
        status: "active",
      },
    });
    isModerator = !!mod;
  }
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }

  // 4. Update the link fields (only those provided)
  const updated = await MyGlobal.prisma.community_platform_post_links.update({
    where: { id: linkId },
    data: {
      url: body.url ?? undefined,
      preview_title: body.preview_title ?? undefined,
      preview_description: body.preview_description ?? undefined,
      preview_image_uri: body.preview_image_uri ?? undefined,
    },
  });

  // 5. Return the updated link per DTO
  return {
    id: updated.id,
    community_platform_post_id: updated.community_platform_post_id,
    url: updated.url,
    preview_title: updated.preview_title ?? undefined,
    preview_description: updated.preview_description ?? undefined,
    preview_image_uri: updated.preview_image_uri ?? undefined,
    ordering: "ordering" in updated ? (updated as any).ordering : undefined,
  };
}

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

export async function postCommunityPlatformMemberPostsPostIdLinks(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostLink.ICreate;
}): Promise<ICommunityPlatformPostLink> {
  const { member, postId, body } = props;

  // 1. Fetch post and verify existence (and not deleted)
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // 2. Authorization: only post author can attach links
  if (post.community_platform_member_id !== member.id) {
    throw new HttpException(
      "You do not have permission to add links to this post",
      403,
    );
  }

  // 3. Create link (without ordering)
  const created = await MyGlobal.prisma.community_platform_post_links.create({
    data: {
      id: v4(),
      community_platform_post_id: postId,
      url: body.url,
      preview_title: body.preview_title ?? undefined,
      preview_description: body.preview_description ?? undefined,
      preview_image_uri: body.preview_image_uri ?? undefined,
    },
  });

  // 4. Build API response
  return {
    id: created.id,
    community_platform_post_id: created.community_platform_post_id,
    url: created.url,
    preview_title: created.preview_title ?? undefined,
    preview_description: created.preview_description ?? undefined,
    preview_image_uri: created.preview_image_uri ?? undefined,
  };
}

import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";

export async function getCommunityPlatformPostsPostIdLinksLinkId(props: {
  postId: string & tags.Format<"uuid">;
  linkId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostLink> {
  const link = await MyGlobal.prisma.community_platform_post_links.findFirst({
    where: {
      id: props.linkId,
      community_platform_post_id: props.postId,
    },
    select: {
      id: true,
      community_platform_post_id: true,
      url: true,
      preview_title: true,
      preview_description: true,
      preview_image_uri: true,
    },
  });
  if (!link) {
    throw new HttpException("Link not found for this post", 404);
  }
  return {
    id: link.id,
    community_platform_post_id: link.community_platform_post_id,
    url: link.url,
    preview_title: link.preview_title ?? undefined,
    preview_description: link.preview_description ?? undefined,
    preview_image_uri: link.preview_image_uri ?? undefined,
    // 'ordering' not included - field does not exist in schema
  };
}

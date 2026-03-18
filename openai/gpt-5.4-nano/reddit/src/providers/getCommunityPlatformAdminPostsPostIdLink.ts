import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminPostsPostIdLink(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostLink> {
  const post = await MyGlobal.prisma.community_platform_posts.findFirstOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      post_type: true,
    },
  });
  if (post.post_type !== "link") {
    throw new HttpException("Representation unavailable", 404);
  }
  const link =
    await MyGlobal.prisma.community_platform_post_links.findFirstOrThrow({
      where: {
        community_platform_post_id: props.postId,
        deleted_at: null,
      },
      select: {
        id: true,
        href: true,
        display_title: true,
        display_description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    id: link.id,
    href: link.href,
    display_title: link.display_title,
    display_description: link.display_description,
    created_at: toISOStringSafe(link.created_at),
    updated_at: toISOStringSafe(link.updated_at),
    deleted_at:
      link.deleted_at === null ? null : toISOStringSafe(link.deleted_at),
  } satisfies ICommunityPlatformPostLink;
}

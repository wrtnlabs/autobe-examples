import { ICommunityPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPostsPostIdLink(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPostLink> {
  const post = await MyGlobal.prisma.community_posts.findUnique({
    where: { id: props.postId },
    select: { content_type: true, community_post_status_id: true },
  });
  if (!post) throw new HttpException("Post not found", 404);
  if (post.content_type !== "link")
    throw new HttpException("Post is not a link-type post", 404);
  const postStatus = await MyGlobal.prisma.community_post_statuses.findUnique({
    where: { id: post.community_post_status_id },
    select: { status: true },
  });
  if (postStatus?.status === "deleted")
    throw new HttpException("Post has been deleted", 404);
  const link = await MyGlobal.prisma.community_post_links.findUnique({
    where: { community_post_id: props.postId },
    select: {
      url: true,
      domain_name: true,
    },
  });
  if (!link) throw new HttpException("Link details not found", 404);
  return {
    url: link.url,
    domain_name: link.domain_name,
  };
}

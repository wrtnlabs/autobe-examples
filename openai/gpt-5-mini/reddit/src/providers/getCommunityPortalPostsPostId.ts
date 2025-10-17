import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";

export async function getCommunityPortalPostsPostId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPortalPost> {
  const { postId } = props;

  try {
    const post = await MyGlobal.prisma.community_portal_posts.findUnique({
      where: { id: postId },
      include: {
        community: {
          select: {
            id: true,
            is_private: true,
            visibility: true,
            slug: true,
            name: true,
          },
        },
        author: {
          select: { id: true, username: true, display_name: true },
        },
      },
    });

    if (!post) throw new HttpException("Not Found", 404);

    // Soft-deleted post: hide from normal callers
    if (post.deleted_at) throw new HttpException("Not Found", 404);

    // Community must exist and privacy enforced
    if (!post.community) throw new HttpException("Not Found", 404);
    if (post.community.is_private) {
      // No caller authentication in props -> deny access to private community
      throw new HttpException("Forbidden", 403);
    }

    const result: ICommunityPortalPost = {
      id: post.id,
      community_id: post.community_id,
      // API allows nullable+optional for author_user_id: return null when absent
      author_user_id: post.author_user_id === null ? null : post.author_user_id,
      post_type: post.post_type,
      title: post.title,
      body: post.body === null ? null : post.body,
      link_url: post.link_url === null ? null : post.link_url,
      image_url: post.image_url === null ? null : post.image_url,
      status: post.status,
      created_at: toISOStringSafe(post.created_at),
      updated_at: toISOStringSafe(post.updated_at),
      // deleted_at is optional/nullable in DTO; for active posts leave undefined
      deleted_at: undefined,
    };

    return result;
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}

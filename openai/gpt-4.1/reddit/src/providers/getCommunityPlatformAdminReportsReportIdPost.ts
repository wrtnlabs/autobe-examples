import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminReportsReportIdPost(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPost> {
  // Step 1: Find the report_of_posts entry
  const reportOfPost =
    await MyGlobal.prisma.community_platform_report_of_posts.findUnique({
      where: { report_id: props.reportId },
      select: { target_post_id: true },
    });
  if (!reportOfPost) {
    throw new HttpException(
      "Report not found or does not reference a post",
      404,
    );
  }

  // Step 2: Query the post and all associated relations
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: reportOfPost.target_post_id },
    include: {
      user: true, // author
      community: true,
      community_platform_post_texts: true,
      community_platform_post_links: true,
      community_platform_post_images: true,
    },
  });
  if (!post) {
    throw new HttpException("Targeted post not found", 404);
  }

  return {
    id: post.id,
    title: post.title,
    status: post.status,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    deleted_at: post.deleted_at ? toISOStringSafe(post.deleted_at) : undefined,
    author: {
      id: post.user.id,
      display_name: post.user.display_name,
    },
    community: {
      id: post.community.id,
      name: post.community.name,
      description: post.community.description,
    },
    text_content: post.community_platform_post_texts
      ? { body: post.community_platform_post_texts.body }
      : null,
    link_content: post.community_platform_post_links
      ? {
          url: post.community_platform_post_links.url,
          summary: post.community_platform_post_links.summary ?? undefined,
        }
      : null,
    image_contents: post.community_platform_post_images
      ? post.community_platform_post_images.map((x) => ({
          uri: x.uri,
          file_type: x.file_type,
          file_size_bytes: x.file_size_bytes,
        }))
      : [],
  };
}

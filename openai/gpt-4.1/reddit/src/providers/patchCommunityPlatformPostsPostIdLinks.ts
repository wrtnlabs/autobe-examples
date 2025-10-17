import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IPageICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostLink";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityPlatformPostsPostIdLinks(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostLink.IRequest;
}): Promise<IPageICommunityPlatformPostLink> {
  const { postId, body } = props;

  // 1. Check if the post exists
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: postId },
    select: { id: true },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // 2. Build filters
  const filters: Record<string, unknown> = {
    community_platform_post_id: postId,
  };
  if (body.url !== undefined && body.url !== null && body.url !== "") {
    filters.url = { contains: body.url };
  }
  if (
    body.preview_title !== undefined &&
    body.preview_title !== null &&
    body.preview_title !== ""
  ) {
    filters.preview_title = { contains: body.preview_title };
  }
  if (
    body.preview_description !== undefined &&
    body.preview_description !== null &&
    body.preview_description !== ""
  ) {
    filters.preview_description = { contains: body.preview_description };
  }

  // 3. Paging & sorting (page: 1-based, limit: capped to 100)
  const page = body.page ?? 1;
  let limit = body.limit ?? 20;
  if (limit > 100) limit = 100;
  const skip = (page - 1) * limit;
  const sortBy = body.sort_by ?? "created_at";
  const sortOrder = body.sort_order ?? "asc";
  const availableSortFields = ["created_at", "preview_title"];
  const orderField = availableSortFields.includes(sortBy)
    ? sortBy
    : "created_at";
  const orderBy = { [orderField]: sortOrder };

  // 4. Query and count
  const [records, total] = await Promise.all([
    MyGlobal.prisma.community_platform_post_links.findMany({
      where: filters,
      orderBy: orderBy,
      skip: skip,
      take: limit,
      select: {
        id: true,
        community_platform_post_id: true,
        url: true,
        preview_title: true,
        preview_description: true,
        preview_image_uri: true,
      },
    }),
    MyGlobal.prisma.community_platform_post_links.count({ where: filters }),
  ]);

  // 5. Map output to proper DTO types (convert nulls to undefined for optionals)
  const data = records.map((link) => ({
    id: link.id,
    community_platform_post_id: link.community_platform_post_id,
    url: link.url,
    preview_title: link.preview_title === null ? undefined : link.preview_title,
    preview_description:
      link.preview_description === null ? undefined : link.preview_description,
    preview_image_uri:
      link.preview_image_uri === null ? undefined : link.preview_image_uri,
    // ordering field is not present
  }));

  // 6. Compose pagination result (use Number() to satisfy tagged type contracts)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: data,
  };
}

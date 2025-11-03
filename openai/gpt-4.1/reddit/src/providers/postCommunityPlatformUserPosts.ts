import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityPlatformUserPosts(props: {
  user: UserPayload;
  body: ICommunityPlatformPost.ICreate;
}): Promise<ICommunityPlatformPost> {
  const { user, body } = props;
  // 1. Validate community exists and is not soft-deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { id: body.community_id, deleted_at: null },
      select: { id: true, name: true, description: true },
    });
  if (!community)
    throw new HttpException(
      "Target community does not exist or is deleted",
      404,
    );

  // 2. Validate user is not banned in this community
  const isBanned =
    await MyGlobal.prisma.community_platform_community_bans.findFirst({
      where: {
        community_platform_user_id: user.id,
        community_platform_community_id: body.community_id,
        revoked_at: null,
        expires_at: null,
      },
      select: { id: true },
    });
  if (isBanned)
    throw new HttpException("You are banned from this community", 403);

  // 3. Check exactly one content type
  const hasText =
    typeof body.text_body === "string" && body.text_body.length > 0;
  const hasLink = typeof body.link_url === "string" && body.link_url.length > 0;
  const hasImages =
    Array.isArray(body.image_files) && body.image_files.length > 0;
  const contentCount = [hasText, hasLink, hasImages].filter(Boolean).length;
  if (contentCount !== 1)
    throw new HttpException(
      "Request must specify exactly one content type (text, link, or images)",
      400,
    );

  // 4. Enforce post title uniqueness for user/community/day
  const nowUtc = new Date();
  const startOfDay = new Date(nowUtc);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(nowUtc);
  endOfDay.setUTCHours(23, 59, 59, 999);
  const dup = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      community_platform_user_id: user.id,
      community_platform_community_id: body.community_id,
      title: body.title,
      created_at: {
        gte: toISOStringSafe(startOfDay),
        lte: toISOStringSafe(endOfDay),
      },
      deleted_at: null,
    },
    select: { id: true },
  });
  if (dup) {
    throw new HttpException(
      "Post title already exists today for this user/community",
      409,
    );
  }

  // 5. Create post record
  const postId = v4();
  const nowIso = toISOStringSafe(nowUtc);
  const created = await MyGlobal.prisma.community_platform_posts.create({
    data: {
      id: postId,
      community_platform_user_id: user.id,
      community_platform_community_id: body.community_id,
      title: body.title,
      status: "published",
      created_at: nowIso,
      updated_at: nowIso,
      deleted_at: null,
    },
    select: {
      id: true,
      title: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  // 6. Handle content
  let textSummary: ICommunityPlatformPostTexts.ISummary | null = null;
  let linkSummary: ICommunityPlatformPostLinks.ISummary | null = null;
  let imageSummaries: ICommunityPlatformPostImage.ISummary[] = [];
  if (hasText) {
    await MyGlobal.prisma.community_platform_post_texts.create({
      data: {
        id: v4(),
        community_platform_post_id: postId,
        body: body.text_body!,
      },
    });
    textSummary = { body: body.text_body! };
  }
  if (hasLink) {
    await MyGlobal.prisma.community_platform_post_links.create({
      data: {
        id: v4(),
        community_platform_post_id: postId,
        url: body.link_url!,
        summary: body.link_summary ?? null,
      },
    });
    linkSummary = {
      url: body.link_url!,
      summary: body.link_summary ?? undefined,
    };
  }
  if (hasImages) {
    const arr = body.image_files!;
    for (let i = 0; i < arr.length; ++i) {
      const img = arr[i];
      await MyGlobal.prisma.community_platform_post_images.create({
        data: {
          id: v4(),
          community_platform_post_id: postId,
          uri: img.uri,
          file_type: img.file_type,
          file_size_bytes: img.file_size_bytes,
        },
      });
      imageSummaries.push({
        uri: img.uri,
        file_type: img.file_type,
        file_size_bytes: img.file_size_bytes,
      });
    }
  }

  // 7. Author summary
  const userRaw =
    await MyGlobal.prisma.community_platform_users.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        id: true,
        display_name: true,
      },
    });

  return {
    id: created.id,
    title: created.title,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
    author: {
      id: userRaw.id,
      display_name: userRaw.display_name,
    },
    community: {
      id: community.id,
      name: community.name,
      description: community.description,
    },
    text_content: textSummary,
    link_content: linkSummary,
    image_contents: imageSummaries,
  };
}

import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function postCommunityBbsCommunityMemberUploads(props: {
  communityMember: CommunitymemberPayload;
  body: ICommunityBbsPostMedia.ICreate;
}): Promise<ICommunityBbsPostMedia> {
  const { communityMember, body } = props;

  // Platform file size limit (10 MB)
  const PLATFORM_MAX_BYTES = 10 * 1024 * 1024;

  // Validate discriminator
  if (body.upload_mode === undefined) {
    throw new HttpException("Bad Request: upload_mode is required", 400);
  }

  // Prisma requires community_bbs_post_id (non-nullable in schema)
  if (
    body.community_bbs_post_id === undefined ||
    body.community_bbs_post_id === null
  ) {
    throw new HttpException(
      "Bad Request: community_bbs_post_id is required",
      400,
    );
  }

  // Ensure post exists and fetch related community
  const post = await MyGlobal.prisma.community_bbs_posts.findUniqueOrThrow({
    where: { id: body.community_bbs_post_id },
    select: {
      id: true,
      community_bbs_community_id: true,
      community_bbs_communitymember_id: true,
    },
  });

  // Authorization: uploader must be the post author or a member of the community
  const isAuthor = post.community_bbs_communitymember_id === communityMember.id;

  const membership =
    await MyGlobal.prisma.community_bbs_community_memberships.findFirst({
      where: {
        community_id: post.community_bbs_community_id,
        community_member_id: communityMember.id,
        status: "member",
      },
    });

  if (!isAuthor && !membership) {
    throw new HttpException(
      "Unauthorized: You must be the post author or a community member to attach media",
      403,
    );
  }

  // Load per-community settings
  const communitySettings =
    await MyGlobal.prisma.community_bbs_community_settings.findUnique({
      where: { community_id: post.community_bbs_community_id },
    });

  // Parse allowed mime types from settings (DB stores CSV string)
  const allowedFromCommunity: string[] | null =
    communitySettings && communitySettings.allowed_image_mime_types
      ? communitySettings.allowed_image_mime_types
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : null;

  // Determine effective allowlist
  const PLATFORM_ALLOWLIST = ["image/jpeg", "image/png", "image/gif"];
  const effectiveAllowlist =
    allowedFromCommunity && allowedFromCommunity.length > 0
      ? allowedFromCommunity
      : PLATFORM_ALLOWLIST;

  // Validate media_type
  if (!effectiveAllowlist.includes(body.media_type)) {
    throw new HttpException(
      "Bad Request: media_type is not allowed for this community",
      400,
    );
  }

  // Validate size
  if (body.size_bytes > PLATFORM_MAX_BYTES) {
    throw new HttpException("Payload Too Large", 413);
  }

  // Enforce per-post image count limit when provided by community settings
  if (
    communitySettings &&
    communitySettings.max_images_per_post !== null &&
    communitySettings.max_images_per_post !== undefined
  ) {
    const existingCount = await MyGlobal.prisma.community_bbs_post_media.count({
      where: { community_bbs_post_id: post.id },
    });
    if (existingCount >= communitySettings.max_images_per_post) {
      throw new HttpException(
        "Bad Request: community has reached max images per post",
        400,
      );
    }
  }

  // Handle upload modes
  if (body.upload_mode === "upload_token") {
    /**
     * CONTRADICTION: The Prisma schema does not include a table for upload
     * tokens or an exchange table that maps upload_token -> CDN URL. Without a
     * persistent upload token resolution table or service binding, the server
     * cannot safely resolve an upload_token to a canonical stored URL. Per
     * Realize guidelines, return a mocked object with typia.random<T>() and a
     * comment explaining the contradiction.
     */
    // NOTE: This path returns a placeholder. Replace with real token
    // resolution once a token store or service is available.
    return typia.random<ICommunityBbsPostMedia>();
  }

  // upload_mode === 'url' handling
  if (body.upload_mode === "url") {
    // Basic SSRF-safe checks: ensure HTTPS and reasonable host
    let parsed: URL;
    try {
      parsed = new URL(body.url);
    } catch (e) {
      throw new HttpException("Bad Request: invalid url", 400);
    }
    if (parsed.protocol !== "https:") {
      throw new HttpException("Bad Request: url must use https", 400);
    }

    // If environment provides CDN_HOST, require it; otherwise allow hosts containing 'cdn' or 's3' or 'storage'
    const cdnHost = (MyGlobal.env && (MyGlobal.env as any).CDN_HOST) as
      | string
      | undefined;
    if (cdnHost) {
      if (!parsed.hostname.endsWith(cdnHost)) {
        throw new HttpException("Bad Request: url host is not allowed", 400);
      }
    } else {
      const hostname = parsed.hostname.toLowerCase();
      if (
        !hostname.includes("cdn") &&
        !hostname.includes("s3") &&
        !hostname.includes("storage") &&
        !hostname.includes("cloud")
      ) {
        throw new HttpException(
          "Bad Request: url host is not allowed by default policy",
          400,
        );
      }
    }

    // Prepare created_at once and reuse
    const now = toISOStringSafe(new Date());

    // Create DB record
    const created = await MyGlobal.prisma.community_bbs_post_media.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_bbs_post_id: post.id,
        moderated_by_system_admin_id: null,
        url: body.url,
        media_type: body.media_type,
        ordering: body.ordering,
        size_bytes: body.size_bytes,
        is_moderated: false,
        moderation_status: "pending",
        moderated_at: null,
        created_at: now as unknown as Date,
      },
      select: {
        id: true,
        community_bbs_post_id: true,
        url: true,
        media_type: true,
        ordering: true,
        size_bytes: true,
        is_moderated: true,
        moderation_status: true,
        moderated_at: true,
        created_at: true,
      },
    });

    // Attempt to enqueue moderation job if helper exists (non-blocking)
    try {
      if (
        typeof (MyGlobal as unknown as Record<string, unknown>)
          .enqueueMediaForModeration === "function"
      ) {
        await (
          (MyGlobal as unknown as Record<string, any>)
            .enqueueMediaForModeration as (id: string) => Promise<void>
        )(created.id);
      }
    } catch (_) {
      // Non-fatal: moderation enqueue failure should not block response
    }

    // Convert dates for API response
    return {
      id: created.id as string & tags.Format<"uuid">,
      post_id: created.community_bbs_post_id as string & tags.Format<"uuid">,
      post: undefined,
      url: created.url,
      media_type: created.media_type,
      ordering: created.ordering,
      size_bytes: created.size_bytes,
      is_moderated: created.is_moderated,
      moderation_status: created.moderation_status as
        | "pending"
        | "approved"
        | "rejected",
      moderated_at: created.moderated_at
        ? toISOStringSafe(created.moderated_at)
        : null,
      created_at: toISOStringSafe(created.created_at),
    };
  }

  throw new HttpException("Bad Request: unsupported upload_mode", 400);
}

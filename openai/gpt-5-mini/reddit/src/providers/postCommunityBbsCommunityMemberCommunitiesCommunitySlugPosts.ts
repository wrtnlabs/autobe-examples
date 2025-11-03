import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function postCommunityBbsCommunityMemberCommunitiesCommunitySlugPosts(props: {
  communityMember: CommunitymemberPayload;
  communitySlug: string;
  body: ICommunityBbsPost.ICreate;
}): Promise<ICommunityBbsPost> {
  const { communityMember, communitySlug, body } = props;

  // Basic business validations
  if (!body.title || body.title.length === 0)
    throw new HttpException("POST_TITLE_REQUIRED", 400);
  if (body.title.length > 300)
    throw new HttpException("POST_TITLE_TOO_LONG", 400);

  const allowedTypes = ["text", "link", "image"] as const;
  if (!allowedTypes.includes(body.post_type))
    throw new HttpException("POST_TYPE_INVALID", 400);
  if (
    body.post_type === "link" &&
    (body.link_url === undefined || body.link_url === null)
  )
    throw new HttpException("POST_LINK_INVALID", 400);

  // Resolve community and its settings
  const community = await MyGlobal.prisma.community_bbs_communities.findUnique({
    where: { slug: communitySlug },
    include: {
      community_bbs_community_settings: true,
      creator: {
        select: {
          id: true,
          username: true,
          display_name: true,
          karma: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  if (!community || community.deleted_at !== null)
    throw new HttpException("Not Found", 404);

  // Authorization: membership required for non-public communities
  const membership =
    await MyGlobal.prisma.community_bbs_community_memberships.findFirst({
      where: {
        community_id: community.id,
        community_member_id: communityMember.id,
        status: "member",
      },
    });
  if (!membership && community.visibility !== "public")
    throw new HttpException("Unauthorized: You must be a member to post", 403);

  // Effective settings and limits
  const settings = community.community_bbs_community_settings ?? null;
  const maxImagesPerPost =
    settings &&
    settings.max_images_per_post !== null &&
    settings.max_images_per_post !== undefined
      ? settings.max_images_per_post
      : Number((MyGlobal.env as any).POSTS_MAX_IMAGES_PER_POST ?? 4);
  const perFileSizeLimit = Number(
    (MyGlobal.env as any).POST_MEDIA_MAX_BYTES ?? 10_485_760,
  );

  const requiresApproval =
    community.post_approval_required === true ||
    (settings && settings.require_post_approval === true);
  const is_published = !requiresApproval;
  const business_status = is_published ? "published" : "pending_moderation";

  // Media validation
  const mediaIds = body.media_ids ?? undefined;
  if (mediaIds && mediaIds.length > 0) {
    if (mediaIds.length > maxImagesPerPost)
      throw new HttpException("MEDIA_LIMIT_EXCEEDED", 400);

    const medias = await MyGlobal.prisma.community_bbs_post_media.findMany({
      where: { id: { in: mediaIds } },
    });
    if (medias.length !== mediaIds.length)
      throw new HttpException("MEDIA_NOT_FOUND", 400);

    for (const m of medias) {
      if (m.community_bbs_post_id !== null)
        throw new HttpException("MEDIA_ALREADY_LINKED", 409);
      if (m.moderation_status === "rejected")
        throw new HttpException("MEDIA_NOT_ALLOWED", 400);
      if (m.size_bytes > perFileSizeLimit)
        throw new HttpException("MEDIA_TOO_LARGE", 400);
    }
  }

  // Create post record
  const now = toISOStringSafe(new Date());
  const postId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.community_bbs_posts.create({
    data: {
      id: postId,
      community_bbs_community_id: community.id,
      community_bbs_communitymember_id: communityMember.id,
      title: body.title,
      body: body.body ?? null,
      post_type: body.post_type,
      link_url: body.link_url ?? null,
      score: 0,
      upvotes: 0,
      downvotes: 0,
      comment_count: 0,
      is_published,
      published_at: is_published ? now : null,
      business_status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Link media to the created post
  if (mediaIds && mediaIds.length > 0) {
    await Promise.all(
      mediaIds.map((mid) =>
        MyGlobal.prisma.community_bbs_post_media.update({
          where: { id: mid },
          data: { community_bbs_post_id: created.id },
        }),
      ),
    );
  }

  // Audit log
  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_type: "community_member",
      actor_id: communityMember.id,
      entity: "post",
      action: "created",
      payload: JSON.stringify({ post_id: created.id }),
      created_at: now,
      updated_at: now,
    },
  });

  // Notify moderators if pending
  if (!is_published) {
    const moderators =
      await MyGlobal.prisma.community_bbs_community_moderators.findMany({
        where: { community_id: community.id, active: true },
      });
    if (moderators.length > 0) {
      await Promise.all(
        moderators.map((mod) =>
          MyGlobal.prisma.community_bbs_notifications.create({
            data: {
              id: v4() as string & tags.Format<"uuid">,
              recipient_id: mod.community_member_id,
              actor_id: communityMember.id,
              target_type: "post",
              target_id: created.id,
              notification_key: `moderation:post:${created.id}`,
              notification_type: "moderation_request",
              channel: "in_app",
              priority: "high",
              status: "pending",
              attempts: 0,
              created_at: now,
              updated_at: now,
              suppressed: false,
              body: `Post requires moderation: ${body.title}`,
            },
          }),
        ),
      );
    }
  }

  // Fetch enriched post for response
  const post = await MyGlobal.prisma.community_bbs_posts.findUniqueOrThrow({
    where: { id: created.id },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          display_name: true,
          karma: true,
          created_at: true,
          updated_at: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          visibility: true,
          post_approval_required: true,
          members_count: true,
          posts_count: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          community_bbs_community_settings: true,
          creator: {
            select: {
              id: true,
              username: true,
              display_name: true,
              karma: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      },
      community_bbs_post_media: true,
    },
  });

  // Map community settings into the expected shape, converting Dates
  const mappedCommunitySettings = post.community
    .community_bbs_community_settings
    ? (() => {
        const s = post.community.community_bbs_community_settings;
        return {
          id: s.id,
          created_at: toISOStringSafe(s.created_at),
          updated_at: toISOStringSafe(s.updated_at),
          deleted_at: s.deleted_at ? toISOStringSafe(s.deleted_at) : null,
          community_id: s.community_id,
          visibility: s.visibility as "public" | "restricted" | "private",
          require_post_approval: s.require_post_approval,
          max_images_per_post: s.max_images_per_post,
          allowed_image_mime_types:
            s.allowed_image_mime_types === null
              ? undefined
              : typeof s.allowed_image_mime_types === "string"
                ? s.allowed_image_mime_types
                    .split(",")
                    .map((x) => x.trim())
                    .filter((x) => x.length > 0)
                : undefined,
        };
      })()
    : undefined;

  const result = {
    id: post.id,
    community_bbs_community_id: post.community_bbs_community_id,
    community_bbs_communitymember_id: post.community_bbs_communitymember_id,
    title: post.title,
    body: post.body === null ? undefined : post.body,
    post_type: typia.assert<"link" | "text" | "image">(post.post_type),
    link_url:
      post.link_url === null
        ? undefined
        : (post.link_url as string & tags.Format<"uri">),
    score: post.score,
    upvotes: post.upvotes,
    downvotes: post.downvotes,
    comment_count: post.comment_count,
    is_published: post.is_published,
    published_at: post.published_at ? toISOStringSafe(post.published_at) : null,
    business_status: post.business_status,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    deleted_at: post.deleted_at ? toISOStringSafe(post.deleted_at) : null,
    author: {
      id: post.author.id,
      username: post.author.username,
      display_name:
        post.author.display_name === null
          ? undefined
          : post.author.display_name,
      karma: post.author.karma,
      created_at: toISOStringSafe(post.author.created_at),
      updated_at: toISOStringSafe(post.author.updated_at),
    },
    community: {
      id: post.community.id,
      name: post.community.name,
      slug: post.community.slug,
      description:
        post.community.description === null
          ? undefined
          : post.community.description,
      creator: post.community.creator
        ? {
            id: post.community.creator.id,
            username: post.community.creator.username,
            display_name:
              post.community.creator.display_name === null
                ? undefined
                : post.community.creator.display_name,
            karma: post.community.creator.karma,
            created_at: toISOStringSafe(post.community.creator.created_at),
            updated_at: toISOStringSafe(post.community.creator.updated_at),
          }
        : {
            id: "",
            username: "",
            display_name: undefined,
            karma: 0,
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
          },
      visibility: post.community.visibility as
        | "public"
        | "restricted"
        | "private",
      post_approval_required: post.community.post_approval_required,
      members_count: Number(post.community.members_count),
      posts_count: Number(post.community.posts_count),
      community_settings: mappedCommunitySettings,
      created_at: toISOStringSafe(post.community.created_at),
      updated_at: toISOStringSafe(post.community.updated_at),
      deleted_at: post.community.deleted_at
        ? toISOStringSafe(post.community.deleted_at)
        : null,
    },
    media: post.community_bbs_post_media.map((m) => ({
      id: m.id,
      post_id: m.community_bbs_post_id ?? post.id,
      post: undefined,
      url: m.url as string & tags.Format<"uri">,
      media_type: m.media_type,
      ordering: m.ordering,
      size_bytes: m.size_bytes,
      is_moderated: m.is_moderated,
      moderation_status: m.moderation_status as
        | "pending"
        | "approved"
        | "rejected",
      moderated_at: m.moderated_at ? toISOStringSafe(m.moderated_at) : null,
      moderated_by: null,
      created_at: toISOStringSafe(m.created_at),
    })),
  } satisfies ICommunityBbsPost;

  return result;
}

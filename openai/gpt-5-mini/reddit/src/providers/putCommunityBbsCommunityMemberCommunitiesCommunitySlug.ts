import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function putCommunityBbsCommunityMemberCommunitiesCommunitySlug(props: {
  communityMember: CommunitymemberPayload;
  communitySlug: string;
  body: ICommunityBbsCommunity.IUpdate;
}): Promise<ICommunityBbsCommunity> {
  const { communityMember, communitySlug, body } = props;

  // Resolve community by unique slug
  const community =
    await MyGlobal.prisma.community_bbs_communities.findUniqueOrThrow({
      where: { slug: communitySlug },
      include: {
        creator: true,
        community_bbs_community_settings: true,
      },
    });

  // Authorization: owner or active moderator required
  if (community.creator_id !== communityMember.id) {
    const moderator =
      await MyGlobal.prisma.community_bbs_community_moderators.findFirst({
        where: {
          community_id: community.id,
          community_member_id: communityMember.id,
          active: true,
        },
      });

    if (!moderator) {
      throw new HttpException(
        "Unauthorized: Only the community owner or an active moderator can update this community",
        403,
      );
    }
  }

  // Prepare timestamp for updates
  const now = toISOStringSafe(new Date());

  try {
    // Update community fields (handle null vs undefined carefully)
    await MyGlobal.prisma.community_bbs_communities.update({
      where: { id: community.id },
      data: {
        ...(body.description === undefined
          ? {}
          : { description: body.description }),
        ...(body.visibility !== undefined
          ? { visibility: body.visibility }
          : {}),
        ...(body.post_approval_required === undefined
          ? {}
          : {
              post_approval_required:
                body.post_approval_required === null
                  ? undefined
                  : body.post_approval_required,
            }),
        updated_at: now,
      },
    });

    // Nested community settings handling
    if (body.community_settings !== undefined) {
      const s = body.community_settings;
      const existing = community.community_bbs_community_settings;

      if (existing) {
        await MyGlobal.prisma.community_bbs_community_settings.update({
          where: { id: existing.id },
          data: {
            ...(s.visibility === undefined
              ? {}
              : s.visibility === null
                ? {} // omit visibility when null to avoid assigning null to non-nullable DB column
                : { visibility: s.visibility }),
            ...(s.require_post_approval === undefined
              ? {}
              : s.require_post_approval === null
                ? {} // OMIT when null to satisfy Prisma update input (no null for boolean)
                : { require_post_approval: s.require_post_approval }),
            ...(s.max_images_per_post === undefined
              ? {}
              : {
                  max_images_per_post:
                    s.max_images_per_post === null
                      ? null
                      : s.max_images_per_post,
                }),
            ...(s.allowed_image_mime_types === undefined
              ? {}
              : {
                  allowed_image_mime_types:
                    s.allowed_image_mime_types === null
                      ? null
                      : s.allowed_image_mime_types.join(","),
                }),
            updated_at: now,
          },
        });
      } else {
        // Create new settings row - for non-nullable columns use community fallbacks
        const visibilityValue =
          s.visibility === undefined
            ? community.visibility
            : s.visibility === null
              ? community.visibility
              : s.visibility;
        const requirePostApprovalValue =
          s.require_post_approval === undefined
            ? community.post_approval_required
            : s.require_post_approval === null
              ? community.post_approval_required
              : s.require_post_approval;

        await MyGlobal.prisma.community_bbs_community_settings.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            community_id: community.id,
            visibility: visibilityValue,
            require_post_approval: requirePostApprovalValue,
            max_images_per_post:
              s.max_images_per_post === undefined
                ? null
                : s.max_images_per_post === null
                  ? null
                  : s.max_images_per_post,
            allowed_image_mime_types:
              s.allowed_image_mime_types === undefined
                ? null
                : s.allowed_image_mime_types === null
                  ? null
                  : s.allowed_image_mime_types.join(","),
            created_at: now,
            updated_at: now,
          },
        });
      }
    }
  } catch (e) {
    if ((e as Prisma.PrismaClientKnownRequestError).code === "P2002") {
      throw new HttpException("Conflict: Unique constraint violation", 409);
    }
    throw e;
  }

  // Re-fetch updated community and map to API DTO
  const updated =
    await MyGlobal.prisma.community_bbs_communities.findUniqueOrThrow({
      where: { id: community.id },
      include: {
        creator: true,
        community_bbs_community_settings: true,
      },
    });

  const creator = updated.creator;
  const creatorSummary = {
    id: creator.id as string & tags.Format<"uuid">,
    username: creator.username,
    display_name: creator.display_name ?? null,
    karma: Number(creator.karma) as number & tags.Type<"int32">,
    created_at: toISOStringSafe(creator.created_at),
    updated_at: toISOStringSafe(creator.updated_at),
  } satisfies ICommunityBbsCommunityMember.ISummary;

  const settingsRow = updated.community_bbs_community_settings;
  const apiSettings = settingsRow
    ? {
        id: settingsRow.id as string & tags.Format<"uuid">,
        community_id: settingsRow.community_id as string & tags.Format<"uuid">,
        visibility: typia.assert<"public" | "restricted" | "private">(
          settingsRow.visibility,
        ),
        require_post_approval: settingsRow.require_post_approval,
        max_images_per_post: settingsRow.max_images_per_post ?? null,
        allowed_image_mime_types: settingsRow.allowed_image_mime_types
          ? settingsRow.allowed_image_mime_types.split(",")
          : undefined,
        created_at: toISOStringSafe(settingsRow.created_at),
        updated_at: toISOStringSafe(settingsRow.updated_at),
        deleted_at: settingsRow.deleted_at
          ? toISOStringSafe(settingsRow.deleted_at)
          : null,
      }
    : undefined;

  return {
    id: updated.id as string & tags.Format<"uuid">,
    name: updated.name,
    slug: updated.slug,
    description: updated.description ?? null,
    visibility: typia.assert<"public" | "restricted" | "private">(
      updated.visibility,
    ),
    post_approval_required: updated.post_approval_required,
    creator: creatorSummary,
    members_count: Number(updated.members_count) as number & tags.Type<"int32">,
    posts_count: Number(updated.posts_count) as number & tags.Type<"int32">,
    community_settings: apiSettings,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  } satisfies ICommunityBbsCommunity;
}

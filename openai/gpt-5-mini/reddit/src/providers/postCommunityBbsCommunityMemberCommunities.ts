import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function postCommunityBbsCommunityMemberCommunities(props: {
  communityMember: CommunitymemberPayload;
  body: ICommunityBbsCommunity.ICreate;
}): Promise<ICommunityBbsCommunity> {
  const { communityMember, body } = props;

  const slugNormalized = body.slug.toLowerCase();
  const nameNormalized = body.name.toLowerCase();

  const reservedBySlug =
    await MyGlobal.prisma.community_bbs_reserved_names.findFirst({
      where: { normalized_name: slugNormalized },
    });
  if (reservedBySlug)
    throw new HttpException("Conflict: slug is reserved", 409);

  const reservedByName =
    await MyGlobal.prisma.community_bbs_reserved_names.findFirst({
      where: { normalized_name: nameNormalized },
    });
  if (reservedByName)
    throw new HttpException("Conflict: name is reserved", 409);

  const existingSlug =
    await MyGlobal.prisma.community_bbs_communities.findFirst({
      where: { slug: slugNormalized },
    });
  if (existingSlug)
    throw new HttpException("Conflict: slug already exists", 409);

  const existingName =
    await MyGlobal.prisma.community_bbs_communities.findFirst({
      where: { name: body.name },
    });
  if (existingName)
    throw new HttpException("Conflict: name already exists", 409);

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.community_bbs_communities.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      creator_id: communityMember.id,
      name: body.name,
      slug: slugNormalized,
      description: body.description ?? null,
      visibility: body.visibility ?? "public",
      post_approval_required: body.post_approval_required ?? false,
      members_count: 0,
      posts_count: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  const settingsRow = body.settings
    ? await MyGlobal.prisma.community_bbs_community_settings.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          community_id: created.id,
          visibility: body.settings.visibility ?? created.visibility,
          require_post_approval:
            body.settings.require_post_approval ??
            created.post_approval_required,
          max_images_per_post: body.settings.max_images_per_post ?? null,
          allowed_image_mime_types: Array.isArray(
            body.settings.allowed_image_mime_types,
          )
            ? body.settings.allowed_image_mime_types.join(",")
            : typeof body.settings.allowed_image_mime_types === "string"
              ? body.settings.allowed_image_mime_types
              : null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      })
    : null;

  await MyGlobal.prisma.community_bbs_community_memberships.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_id: created.id,
      community_member_id: communityMember.id,
      invited_by_id: null,
      status: "member",
      role: null,
      joined_at: now,
      created_at: now,
      updated_at: now,
    },
  });

  void (async () => {
    try {
      await MyGlobal.prisma.community_bbs_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          actor_type: "community_member",
          actor_id: communityMember.id,
          entity: "community",
          action: "created",
          payload: JSON.stringify({
            community_id: created.id,
            creator_id: communityMember.id,
          }),
          ip: null,
          created_at: now,
          updated_at: now,
        },
      });
    } catch (_) {
      // swallow
    }
  })();

  const creator =
    await MyGlobal.prisma.community_bbs_communitymember.findUniqueOrThrow({
      where: { id: communityMember.id },
      select: {
        id: true,
        username: true,
        display_name: true,
        karma: true,
        created_at: true,
        updated_at: true,
      },
    });

  return {
    id: created.id,
    name: created.name,
    slug: created.slug,
    description:
      created.description === null ? null : (created.description ?? undefined),
    visibility: created.visibility as "public" | "restricted" | "private",
    post_approval_required: created.post_approval_required,
    creator: {
      id: creator.id,
      username: creator.username,
      display_name:
        creator.display_name === null
          ? null
          : (creator.display_name ?? undefined),
      karma: creator.karma,
      created_at: toISOStringSafe(creator.created_at),
      updated_at: toISOStringSafe(creator.updated_at),
    },
    members_count: created.members_count,
    posts_count: created.posts_count,
    community_settings: settingsRow
      ? {
          id: settingsRow.id,
          community_id: settingsRow.community_id,
          visibility: settingsRow.visibility as
            | "public"
            | "restricted"
            | "private"
            | undefined,
          require_post_approval: settingsRow.require_post_approval ?? null,
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
      : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  } satisfies ICommunityBbsCommunity;
}

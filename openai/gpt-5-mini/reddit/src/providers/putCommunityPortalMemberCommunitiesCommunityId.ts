import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPortalMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPortalCommunity.IUpdate;
}): Promise<ICommunityPortalCommunity> {
  const { member, communityId, body } = props;

  // Fetch community and ensure it's not soft-deleted
  const community =
    await MyGlobal.prisma.community_portal_communities.findUnique({
      where: { id: communityId },
      select: {
        id: true,
        creator_user_id: true,
        name: true,
        slug: true,
        description: true,
        is_private: true,
        visibility: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (!community || community.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Authorization: creator OR active moderator for this community OR active admin
  const isCreator = community.creator_user_id === member.id;

  const moderator = await MyGlobal.prisma.community_portal_moderators.findFirst(
    {
      where: {
        user_id: member.id,
        community_id: communityId,
        is_active: true,
      },
    },
  );

  const admin = await MyGlobal.prisma.community_portal_admins.findFirst({
    where: {
      user_id: member.id,
      is_active: true,
    },
  });

  if (!isCreator && !moderator && !admin) {
    throw new HttpException(
      "Unauthorized: You do not have permission to update this community",
      403,
    );
  }

  // If slug provided and changed, enforce uniqueness among active records
  if (body.slug !== undefined && body.slug !== community.slug) {
    const conflict =
      await MyGlobal.prisma.community_portal_communities.findFirst({
        where: {
          slug: body.slug,
          deleted_at: null,
        },
      });
    if (conflict) throw new HttpException("Conflict: slug already in use", 409);
  }

  // Perform update with inline data object per guidelines
  const updated = await MyGlobal.prisma.community_portal_communities.update({
    where: { id: communityId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.slug !== undefined && { slug: body.slug }),
      ...(body.description !== undefined
        ? { description: body.description }
        : {}),
      ...(body.is_private !== undefined && { is_private: body.is_private }),
      ...(body.visibility !== undefined && { visibility: body.visibility }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id as string as string & tags.Format<"uuid">,
    creator_user_id:
      updated.creator_user_id === null
        ? null
        : (updated.creator_user_id as string as string & tags.Format<"uuid">),
    name: updated.name,
    slug: updated.slug,
    description: updated.description ?? null,
    is_private: updated.is_private,
    visibility: updated.visibility,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}

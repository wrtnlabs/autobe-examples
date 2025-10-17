import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminCommunitiesCommunityId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunity.IUpdate;
}): Promise<ICommunityPlatformCommunity> {
  // Destructure props
  const { admin, communityId, body } = props;

  // Fetch the community to update (throw 404 if not found or deleted)
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: communityId,
        deleted_at: null,
      },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Business rule: status transitions (example: prevent switching to illegal statuses)
  if (body.status !== undefined) {
    // List of allowed statuses (example set, actual from business spec). Adjust as needed.
    const allowedStatuses = ["active", "private", "banned", "archived"];
    if (!allowedStatuses.includes(body.status)) {
      throw new HttpException("Forbidden community status value", 400);
    }
    // Example: prevent changing from 'archived' to 'banned'
    if (community.status === "archived" && body.status === "banned") {
      throw new HttpException(
        "Cannot transition to 'banned' from 'archived'",
        400,
      );
    }
  }

  // Prepare update object (only set fields present)
  const updateData = {
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.description !== undefined
      ? { description: body.description }
      : {}),
    ...(body.slug !== undefined ? { slug: body.slug } : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  // Perform update, handle unique constraints
  let updated;
  try {
    updated = await MyGlobal.prisma.community_platform_communities.update({
      where: { id: communityId },
      data: updateData,
    });
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as any).code === "P2002"
    ) {
      // Prisma unique constraint error (name or slug not unique)
      throw new HttpException("Duplicate community name or slug", 409);
    }
    throw e;
  }

  // Return as ICommunityPlatformCommunity
  return {
    id: updated.id,
    creator_member_id: updated.creator_member_id,
    name: updated.name,
    title: updated.title,
    description:
      typeof updated.description === "undefined"
        ? undefined
        : (updated.description ?? null),
    slug: updated.slug,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}

import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putCommunityPlatformModeratorCommunitiesCommunityId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunity.IUpdate;
}): Promise<ICommunityPlatformCommunity> {
  // Check moderator is assigned and active for the specified community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: props.communityId,
        deleted_at: null,
        status: "active",
      },
    });
  if (!moderatorAssignment) {
    throw new HttpException(
      "Forbidden: You are not an active moderator of this community",
      403,
    );
  }

  // Find the community
  const existing =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.communityId },
    });
  if (!existing || existing.deleted_at) {
    throw new HttpException(
      "Not Found: Community not found or has been deleted",
      404,
    );
  }

  // Prepare update data (only allowed fields)
  const now = toISOStringSafe(new Date());
  try {
    const updated = await MyGlobal.prisma.community_platform_communities.update(
      {
        where: { id: props.communityId },
        data: {
          title: props.body.title ?? undefined,
          description: props.body.description ?? undefined,
          slug: props.body.slug ?? undefined,
          status: props.body.status ?? undefined,
          updated_at: now,
        },
      },
    );
    return {
      id: updated.id,
      creator_member_id: updated.creator_member_id,
      name: updated.name,
      title: updated.title,
      description: updated.description ?? undefined,
      slug: updated.slug,
      status: updated.status,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: now,
      deleted_at: updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Unique constraint failed
      throw new HttpException(
        "Conflict: Community name or slug already exists",
        409,
      );
    }
    throw new HttpException("Internal Server Error", 500);
  }
}

import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityModeratorAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminCommunitiesCommunityIdModerators(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModerator.IUpdate;
}): Promise<ICommunityPlatformCommunityModerator.ISummary> {
  const { admin, communityId, body } = props;
  // Verify community existence
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: communityId },
      select: { id: true },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Fetch active moderators
  const moderators =
    await MyGlobal.prisma.community_platform_community_moderators.findMany({
      where: { community_id: communityId, deleted_at: null },
    });
  // Validate input has communityModeratorId
  if (body.communityModeratorId === undefined) {
    throw new HttpException("Moderator user id is required", 400);
  }
  // Narrow role
  if (body.role !== "owner" && body.role !== "moderator") {
    throw new HttpException("Role must be 'owner' or 'moderator'", 400);
  }
  const role: "owner" | "moderator" = body.role;
  // Narrow communityModeratorId to string & tags.Format<'uuid'> explicitly
  const communityModeratorId = body.communityModeratorId as string &
    tags.Format<"uuid">;
  // Find current owner
  const currentOwner = moderators.find((m) => m.role === "owner");
  // Prevent owner role collision
  if (
    currentOwner &&
    currentOwner.community_moderator_id !== communityModeratorId &&
    role === "owner"
  ) {
    throw new HttpException(
      "Owner role is already assigned to another user",
      400,
    );
  }
  // Prepare timestamps
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (
      role === "owner" &&
      currentOwner &&
      currentOwner.community_moderator_id !== communityModeratorId
    ) {
      await tx.community_platform_community_moderators.updateMany({
        where: {
          community_id: communityId,
          role: "owner",
          community_moderator_id: { not: communityModeratorId },
          deleted_at: null,
        },
        data: {
          role: "moderator",
          updated_at: now,
        },
      });
    }
    // Upsert
    const existing = moderators.find(
      (m) => m.community_moderator_id === communityModeratorId,
    );
    if (existing) {
      await tx.community_platform_community_moderators.update({
        where: { id: existing.id },
        data: {
          role: role,
          updated_at: now,
          deleted_at: null,
        },
      });
    } else {
      await tx.community_platform_community_moderators.create({
        data: {
          id: v4(),
          community_id: communityId,
          community_moderator_id: communityModeratorId,
          role: role,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    }
  });
  // Retrieve updated moderator
  const updatedModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirstOrThrow(
      {
        where: {
          community_id: communityId,
          community_moderator_id: communityModeratorId,
          deleted_at: null,
        },
        ...CommunityPlatformCommunityModeratorAtSummaryTransformer.select(),
      },
    );
  return await CommunityPlatformCommunityModeratorAtSummaryTransformer.transform(
    updatedModerator,
  );
}

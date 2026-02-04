import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";

export async function deleteCommunityPlatformOwnerOwnersOwnerId(props: {
  owner: OwnerPayload;
  ownerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify that the requesting owner is authorized to delete this owner
  if (props.owner.id !== props.ownerId) {
    throw new HttpException("Not authorized to delete this owner", 403);
  }
  // Verify owner exists and is not already deleted
  const existingOwner =
    await MyGlobal.prisma.community_platform_owners.findUnique({
      where: {
        id: props.ownerId,
      },
    });
  if (!existingOwner) {
    throw new HttpException("Owner not found", 404);
  }
  // Log deletion event in moderation_logs with audit details
  await MyGlobal.prisma.community_platform_moderation_logs.create({
    data: {
      id: v4(),
      actorId: props.owner.id,
      actorType: "owner",
      targetId: props.ownerId,
      targetType: "owner",
      details: {
        displayName: existingOwner.display_name,
        email: existingOwner.email,
      },
      createdAt: toISOStringSafe(new Date()),
      updatedAt: toISOStringSafe(new Date()),
    },
  });
  // Delete owner record
  await MyGlobal.prisma.community_platform_owners.delete({
    where: {
      id: props.ownerId,
    },
  });
}

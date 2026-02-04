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
import { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { CommunityPlatformOwnerTransformer } from "../transformers/CommunityPlatformOwnerTransformer";

export async function putCommunityPlatformOwnerOwnersOwnerId(props: {
  owner: OwnerPayload;
  ownerId: string & tags.Format<"uuid">;
  body: ICommunityPlatformOwner.IUpdate;
}): Promise<ICommunityPlatformOwner> {
  // Verify owner exists
  const existingOwner =
    await MyGlobal.prisma.community_platform_owners.findUnique({
      where: { id: props.ownerId, deleted_at: null },
    });
  if (!existingOwner) {
    throw new HttpException("Owner not found", 404);
  }
  // Verify email is unique across all owners - fish we now know from db schema alone that username doesn't exist
  // We need to find a different approach: because we can't use 'not', we'll use a different query pattern
  const allOwners = await MyGlobal.prisma.community_platform_owners.findMany({
    where: { email: props.body.email },
  });
  const matchingOwner = allOwners.find((owner) => owner.id !== props.ownerId);
  if (matchingOwner) {
    throw new HttpException("Email already in use", 409);
  }
  // Update owner with transaction to ensure consistency
  const updatedOwner = await MyGlobal.prisma.$transaction(async (prisma) => {
    return await prisma.community_platform_owners.update({
      where: { id: props.ownerId },
      data: {
        email: props.body.email,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  });
  // Return transformed result
  return CommunityPlatformOwnerTransformer.transform(updatedOwner);
}

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
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putCommunityPlatformOwnerCommunitiesCommunityCode(props: {
  owner: OwnerPayload;
  communityCode: string;
  body: ICommunityPlatformCommunity.IUpdate;
}): Promise<ICommunityPlatformCommunity> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: {
        id: props.communityCode,
      },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Verify ownership - owner must be registered in community_platform_owners table
  const ownerRecord = await MyGlobal.prisma.community_platform_owners.findFirst(
    {
      where: {
        id: props.owner.id,
        community_id: community.id, // ✅ Corrected: Using 'community_id' instead of 'community' to match the actual schema field
        deleted_at: null,
      },
    },
  );
  if (!ownerRecord) {
    throw new HttpException(
      "Forbidden - You are not the owner of this community",
      403,
    );
  }
  // Since ICommunityPlatformCommunity.IUpdate is empty, no data to update
  // Return the existing community unchanged
  return {
    community_code: community.id,
  };
}

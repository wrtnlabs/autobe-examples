import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformMemberCommunitiesCommunityIdIcon(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch community and verify ownership
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.communityId },
      select: {
        id: true,
        owner_id: true,
        deleted_at: true,
      },
    });
  if (community === null || community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }
  if (community.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Fetch existing icon file if exists
  const existingFile =
    await MyGlobal.prisma.community_platform_files.findUnique({
      where: { community_id: props.communityId },
      select: { id: true },
    });
  // Step 3: Execute transaction to remove icon and update community
  await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date();
    // Soft-delete the file if it exists
    if (existingFile !== null) {
      await tx.community_platform_files.update({
        where: { id: existingFile.id },
        data: {
          deleted_at: now,
          community_id: null,
        },
      });
    }
    // Update community: remove icon reference and update timestamp
    await tx.community_platform_communities.update({
      where: { id: props.communityId },
      data: {
        icon: null,
        updated_at: now,
      },
    });
  });
}

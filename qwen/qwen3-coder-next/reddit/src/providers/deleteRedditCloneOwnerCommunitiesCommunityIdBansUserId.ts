import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCloneOwnerCommunitiesCommunityIdBansUserId(props: {
  owner: OwnerPayload;
  communityId: string;
  userId: string;
}): Promise<void> {
  // Check owner has moderator/owner privileges in the community
  const hasPermission = await MyGlobal.prisma.$queryRaw<
    [
      {
        count: number;
      },
    ]
  >`
    SELECT COUNT(*) as count FROM (
      SELECT 1 FROM reddit_clone_community_moderators 
      WHERE community_id = ${props.communityId} 
      AND moderator_id = ${props.owner.id} 
      AND deleted_at IS NULL
      UNION
      SELECT 1 FROM reddit_clone_community_owners 
      WHERE community_id = ${props.communityId} 
      AND owner_id = ${props.owner.id} 
      AND deleted_at IS NULL
    ) as roles
  `;
  if ((hasPermission[0].count as number) === 0) {
    throw new HttpException("Forbidden", 403);
  }
  // Look up the ban record
  const banRecord = await MyGlobal.prisma.reddit_clone_ban_records.findFirst({
    where: {
      community_id: props.communityId,
      member_id: props.userId,
    },
  });
  if (banRecord === null) {
    throw new HttpException("Not Found", 404);
  }
  // Verify ban is currently active
  if (banRecord.is_active === false) {
    throw new HttpException("Conflict", 409);
  }
  // Delete the ban record
  await MyGlobal.prisma.reddit_clone_ban_records.delete({
    where: {
      id: banRecord.id,
    },
  });
}

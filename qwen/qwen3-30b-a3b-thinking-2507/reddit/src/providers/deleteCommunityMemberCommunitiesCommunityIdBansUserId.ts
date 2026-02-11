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

export async function deleteCommunityMemberCommunitiesCommunityIdBansUserId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify user is community moderator or owner
  const isModerator = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: props.communityId,
      user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify ban record exists
  const banRecord = await MyGlobal.prisma.community_banned_users.findFirst({
    where: {
      community_id: props.communityId,
      user_id: props.userId,
      deleted_at: null,
    },
  });
  if (!banRecord) {
    throw new HttpException("Ban not found", 404);
  }
  // Soft delete ban record
  await MyGlobal.prisma.community_banned_users.update({
    where: { id: banRecord.id },
    data: { deleted_at: new Date() },
  });
}

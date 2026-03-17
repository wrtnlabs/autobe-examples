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

export async function deleteRedditCloneMemberCommunitiesCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify moderator authority in the community
  await MyGlobal.prisma.reddit_clone_moderators.findFirstOrThrow({
    where: {
      community_id: props.communityId,
      member_id: props.member.id,
      deleted_at: null,
    },
  });
  // Verify ban exists and is currently active (not already deleted)
  await MyGlobal.prisma.reddit_clone_bans.findFirstOrThrow({
    where: {
      id: props.banId,
      community_id: props.communityId,
      deleted_at: null,
    },
  });
  // Soft delete the ban record - preserves history for audit
  await MyGlobal.prisma.reddit_clone_bans.update({
    where: { id: props.banId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}

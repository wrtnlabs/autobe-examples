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

export async function deleteRedditCommunityMemberCommunitiesCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify moderator authority
  const moderator = await MyGlobal.prisma.reddit_community_moderators.findFirst(
    {
      where: {
        reddit_community_member_id: props.member.id,
        reddit_community_community_id: props.communityId,
        role: { in: ["owner", "moderator"] },
        deleted_at: null,
      },
    },
  );
  if (!moderator) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch ban record
  const ban = await MyGlobal.prisma.reddit_community_bans.findUniqueOrThrow({
    where: { id: props.banId },
  });
  // Verify ban belongs to the specified community
  if (ban.reddit_community_community_id !== props.communityId) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify ban is currently active
  if (ban.status !== "active") {
    throw new HttpException("Bad Request", 400);
  }
  // Update ban status to removed
  await MyGlobal.prisma.reddit_community_bans.update({
    where: { id: props.banId },
    data: {
      status: "removed",
      updated_at: new Date(),
    },
  });
}

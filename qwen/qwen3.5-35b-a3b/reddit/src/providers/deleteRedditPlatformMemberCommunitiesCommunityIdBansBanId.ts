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

export async function deleteRedditPlatformMemberCommunitiesCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch the ban record and verify it belongs to the specified community
  const ban = await MyGlobal.prisma.reddit_platform_community_bans.findFirst({
    where: {
      id: props.banId,
      community_id: props.communityId,
      deleted_at: null,
    },
    include: {
      community: {
        select: {
          owner_id: true,
          moderators: {
            select: {
              user_id: true,
            },
          },
        },
      },
    },
  });
  if (ban === null) {
    throw new HttpException("Ban not found", 404);
  }
  // Step 2: Verify the requesting member is the owner or moderator of the community
  const isOwner = ban.community.owner_id === props.member.id;
  const isModerator = ban.community.moderators.some(
    (mod) => mod.user_id === props.member.id,
  );
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Soft delete the ban record
  await MyGlobal.prisma.reddit_platform_community_bans.update({
    where: {
      id: props.banId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}

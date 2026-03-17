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

export async function deleteCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
      },
      select: {
        id: true,
        community_platform_member_id: true,
      },
    });
  if (community.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirstOrThrow(
      {
        where: {
          community_platform_community_id: props.communityId,
          community_platform_member_id: props.moderatorId,
        },
        select: {
          id: true,
          status: true,
          owner: {
            select: {
              id: true,
            },
          },
        },
      },
    );
  if (moderator.owner !== null) {
    throw new HttpException(
      "Owner cannot be removed through moderator removal",
      400,
    );
  }
  if (moderator.status !== "active") {
    throw new HttpException("Moderator assignment is not removable", 400);
  }
  const now: string & tags.Format<"date-time"> =
    new globalThis.Date().toISOString();
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.community_platform_community_moderators.update({
      where: {
        id: moderator.id,
      },
      data: {
        status: "revoked",
        community_platform_revoked_by_member_id: props.member.id,
        revoked_at: now,
        revocation_reason: "Owner initiated moderator removal",
        updated_at: now,
        deleted_at: now,
      },
    });
  });
}

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

export async function deleteRedditCloneMemberCommunitiesCommunityNameIcons(props: {
  member: MemberPayload;
  communityName: string;
}): Promise<void> {
  // 1. Find community by name
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { name: props.communityName },
      select: {
        id: true,
        reddit_clone_member_id: true,
      },
    });
  // 2. Verify the authenticated member is the owner
  if (community.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Find the icon for this community
  const icon = await MyGlobal.prisma.reddit_clone_community_icons.findUnique({
    where: { reddit_clone_community_id: community.id },
    select: {
      id: true,
    },
  });
  // 4. If no icon exists, return 404
  if (icon === null) {
    throw new HttpException("Not Found", 404);
  }
  // 5. Delete the icon record
  await MyGlobal.prisma.reddit_clone_community_icons.delete({
    where: { id: icon.id },
  });
  // 6. Return void (204 No Content)
}

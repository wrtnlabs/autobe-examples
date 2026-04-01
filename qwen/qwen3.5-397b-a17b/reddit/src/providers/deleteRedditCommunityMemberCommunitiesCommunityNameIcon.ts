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

export async function deleteRedditCommunityMemberCommunitiesCommunityNameIcon(props: {
  member: MemberPayload;
  communityName: string;
}): Promise<void> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
      select: {
        id: true,
        reddit_community_member_id: true,
      },
    });
  if (community.reddit_community_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const icon =
    await MyGlobal.prisma.reddit_community_community_icons.findUnique({
      where: {
        reddit_community_community_id: community.id,
      },
    });
  if (icon !== null) {
    await MyGlobal.prisma.reddit_community_community_icons.update({
      where: {
        id: icon.id,
      },
      data: {
        deleted_at: new Date(),
      },
    });
  }
}

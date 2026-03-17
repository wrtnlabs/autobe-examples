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

export async function deleteCommunityPlatformMemberCommunitiesCommunitySlug(props: {
  member: MemberPayload;
  communitySlug: string & tags.Format<"uuid">;
}): Promise<void> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { slug: props.communitySlug },
      select: {
        id: true,
        community_platform_member_id: true,
      },
    });
  if (community.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.community_platform_communities.delete({
      where: { id: community.id },
    });
  });
}

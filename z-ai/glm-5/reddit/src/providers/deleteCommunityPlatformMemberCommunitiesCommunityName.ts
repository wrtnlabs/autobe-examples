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

export async function deleteCommunityPlatformMemberCommunitiesCommunityName(props: {
  member: MemberPayload;
  communityName: string;
}): Promise<void> {
  // Verify community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_id: true,
      },
    });
  // Verify the requesting member is the owner
  if (community.owner_id !== props.member.id) {
    throw new HttpException(
      "Only the community owner can perform this action",
      403,
    );
  }
  // Business rule: Communities cannot be deleted
  throw new HttpException(
    "Community deletion is not supported. Communities are retained indefinitely per platform policy.",
    403,
  );
}

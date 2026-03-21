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

export async function deleteRedditCloneMemberCommunitiesCommunityName(props: {
  member: MemberPayload;
  communityName: string;
}): Promise<void> {
  // Find the community by name
  const community = await MyGlobal.prisma.reddit_clone_communities.findUnique({
    where: {
      name: props.communityName,
    },
    select: {
      id: true,
      reddit_clone_member_id: true,
      deleted_at: true,
    },
  });
  // Check if community exists and is not already deleted
  if (community === null || community.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // Verify the requesting member is the owner of the community
  if (community.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete the community by setting deleted_at timestamp
  await MyGlobal.prisma.reddit_clone_communities.update({
    where: {
      id: community.id,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}

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

export async function deleteRedditLikeMemberCommunitiesName(props: {
  member: MemberPayload;
  name: string;
}): Promise<void> {
  // Find the community by name
  const community = await MyGlobal.prisma.reddit_like_communities.findUnique({
    where: { name: props.name },
    select: { id: true, member_id: true },
  });
  // Community not found
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Verify member is the owner
  if (community.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete the community (cascades to moderator roles, posts, comments, votes, subscriptions)
  await MyGlobal.prisma.reddit_like_communities.delete({
    where: { id: community.id },
  });
}

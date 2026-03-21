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

export async function deleteRedditCloneMemberCommunitiesCommunityNameModeratorsModeratorId(props: {
  member: MemberPayload;
  communityName: string;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Retrieve the community by communityName
  const community = await MyGlobal.prisma.reddit_clone_communities.findUnique({
    where: { name: props.communityName },
    select: { id: true, reddit_clone_member_id: true },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // 2. Verify the authenticated user is the owner of the community
  if (community.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Only the owner can remove moderators", 403);
  }
  // 3. Retrieve the moderator record from reddit_clone_moderators
  const moderator = await MyGlobal.prisma.reddit_clone_moderators.findFirst({
    where: {
      id: props.moderatorId,
      reddit_clone_community_id: community.id,
      deleted_at: null,
    },
    select: { id: true, role: true },
  });
  if (moderator === null) {
    throw new HttpException("Moderator not found", 404);
  }
  // 4. Check that the moderator's role is not 'owner'
  if (moderator.role === "owner") {
    throw new HttpException("The owner cannot be removed", 400);
  }
  // 5. Soft delete by setting deleted_at to current timestamp
  await MyGlobal.prisma.reddit_clone_moderators.update({
    where: { id: props.moderatorId },
    data: { deleted_at: new Date() },
  });
}

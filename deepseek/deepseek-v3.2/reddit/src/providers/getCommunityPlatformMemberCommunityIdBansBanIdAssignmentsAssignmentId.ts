import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformBanAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanAssignment";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformBanAssignmentTransformer } from "../transformers/CommunityPlatformBanAssignmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommunityIdBansBanIdAssignmentsAssignmentId(props: {
  member: MemberPayload;
  communityId: string;
  banId: string;
  assignmentId: string;
}): Promise<ICommunityPlatformBanAssignment> {
  // 1. Verify member has moderation role (owner or moderator) in the community
  const moderationRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_community_id: props.communityId,
        deleted_at: null,
        role_type: { in: ["owner", "moderator"] },
      },
    });
  if (!moderationRole) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify ban exists and belongs to the specified community
  // findUniqueOrThrow will automatically throw 404 if ban not found
  await MyGlobal.prisma.community_platform_bans.findUniqueOrThrow({
    where: {
      id: props.banId,
      community_id: props.communityId,
    },
  });
  // 3. Retrieve the assignment with full transformer select
  const assignment =
    await MyGlobal.prisma.community_platform_ban_assignments.findUniqueOrThrow({
      where: {
        id: props.assignmentId,
        community_platform_ban_id: props.banId,
        deleted_at: null, // Only return active, non-deleted assignments
      },
      ...CommunityPlatformBanAssignmentTransformer.select(),
    });
  // 4. Transform database result to API response DTO
  return await CommunityPlatformBanAssignmentTransformer.transform(assignment);
}

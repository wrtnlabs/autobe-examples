import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import { ICommunityPlatformCommunityFlairAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlairAssignment";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityFlairAssignmentCollector } from "../collectors/CommunityPlatformCommunityFlairAssignmentCollector";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommunityFlairAssignmentTransformer } from "../transformers/CommunityPlatformCommunityFlairAssignmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorCommunitiesCommunityIdFlairAssignments(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityFlairAssignment.ICreate;
}): Promise<ICommunityPlatformCommunityFlairAssignment> {
  // Verify community exists and is active
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!community) {
    throw new HttpException("Community not found or has been deleted", 404);
  }
  // Verify flair exists, belongs to community, and is active
  const flair =
    await MyGlobal.prisma.community_platform_community_flairs.findFirst({
      where: {
        id: props.body.community_platform_community_flair_id,
        community_platform_community_id: props.communityId,
        is_active: true,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!flair) {
    throw new HttpException(
      "Flair not found, inactive, or does not belong to this community",
      404,
    );
  }
  // Verify target user exists and is active
  const targetUser = await MyGlobal.prisma.community_platform_users.findFirst({
    where: {
      id: props.body.community_platform_user_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!targetUser) {
    throw new HttpException("Target user not found or has been deleted", 404);
  }
  // Verify moderator has permissions in the community (FIXED FIELD NAME)
  const moderatorPermission =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.moderator.id, // FIXED: Changed from community_platform_user_id to user_id
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!moderatorPermission) {
    throw new HttpException(
      "You do not have moderator permissions in this community",
      403,
    );
  }
  // Check for existing active assignment
  const now = new Date();
  const existingAssignment =
    await MyGlobal.prisma.community_platform_community_flair_assignments.findFirst(
      {
        where: {
          community_platform_user_id: props.body.community_platform_user_id,
          community_platform_community_id: props.communityId,
          community_platform_community_flair_id:
            props.body.community_platform_community_flair_id,
          deleted_at: null,
          OR: [{ expired_at: null }, { expired_at: { gt: now } }],
        },
        select: { id: true },
      },
    );
  if (existingAssignment) {
    throw new HttpException("Active flair assignment already exists", 409);
  }
  // Create the flair assignment using collector
  const assignment =
    await MyGlobal.prisma.community_platform_community_flair_assignments.create(
      {
        data: await CommunityPlatformCommunityFlairAssignmentCollector.collect({
          body: props.body,
          communityPlatformCommunities: { id: props.communityId },
          communityPlatformUsers: { id: props.moderator.id },
          communityPlatformUserSessions: { id: props.moderator.session_id },
        }),
        ...CommunityPlatformCommunityFlairAssignmentTransformer.select(),
      },
    );
  // Transform and return the assignment
  return await CommunityPlatformCommunityFlairAssignmentTransformer.transform(
    assignment,
  );
}

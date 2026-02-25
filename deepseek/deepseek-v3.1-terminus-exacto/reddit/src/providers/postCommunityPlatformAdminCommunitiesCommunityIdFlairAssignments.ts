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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityFlairAssignmentTransformer } from "../transformers/CommunityPlatformCommunityFlairAssignmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminCommunitiesCommunityIdFlairAssignments(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityFlairAssignment.ICreate;
}): Promise<ICommunityPlatformCommunityFlairAssignment> {
  // Verify admin exists in community_platform_admins table (extra security layer)
  await MyGlobal.prisma.community_platform_admins.findUniqueOrThrow({
    where: {
      id: props.admin.id,
      deleted_at: null,
      is_active: true,
    },
    select: { id: true },
  });
  // Verify community exists and is active
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Verify flair exists, belongs to target community, and is active
  const flair =
    await MyGlobal.prisma.community_platform_community_flairs.findUniqueOrThrow(
      {
        where: {
          id: props.body.community_platform_community_flair_id,
          community: {
            id: props.communityId,
            deleted_at: null,
          },
          is_active: true,
          deleted_at: null,
        },
        select: { id: true },
      },
    );
  // Verify target user exists and is active
  await MyGlobal.prisma.community_platform_users.findUniqueOrThrow({
    where: {
      id: props.body.community_platform_user_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Check for existing active assignment (unique constraint on user+community+flair)
  const now = toISOStringSafe(new Date());
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
    throw new HttpException(
      "User already has an active assignment of this flair in this community",
      400,
    );
  }
  // Create the flair assignment record using Collector
  // Collector expects IEntity type structure: { id: string, ... }
  const adminEntity = { id: props.admin.id } satisfies IEntity;
  const communityEntity = { id: props.communityId } satisfies IEntity;
  const sessionEntity = { id: props.admin.session_id } satisfies IEntity;
  const created =
    await MyGlobal.prisma.community_platform_community_flair_assignments.create(
      {
        data: await CommunityPlatformCommunityFlairAssignmentCollector.collect({
          body: props.body,
          communityPlatformCommunities: communityEntity,
          communityPlatformUsers: adminEntity,
          communityPlatformUserSessions: sessionEntity,
        }),
        ...CommunityPlatformCommunityFlairAssignmentTransformer.select(),
      },
    );
  // Transform and return using Transformer
  return await CommunityPlatformCommunityFlairAssignmentTransformer.transform(
    created,
  );
}

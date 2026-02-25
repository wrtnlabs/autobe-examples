import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorAssignment";
import { ICommunityPlatformModeratorAssignmentPrivilege } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorAssignmentPrivilege";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformModeratorAssignmentPrivilegeCollector } from "../collectors/CommunityPlatformModeratorAssignmentPrivilegeCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformModeratorAssignmentPrivilegeTransformer } from "../transformers/CommunityPlatformModeratorAssignmentPrivilegeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminCommunitiesCommunityIdModeratorsModeratorIdPrivileges(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModeratorAssignmentPrivilege.ICreate;
}): Promise<ICommunityPlatformModeratorAssignmentPrivilege> {
  // Verify community exists
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Verify moderator assignment exists and belongs to the specified community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_moderator_assignments.findFirst({
      where: {
        id: props.moderatorId,
        community_id: props.communityId,
        deleted_at: null,
      },
    });
  if (!moderatorAssignment) {
    throw new HttpException(
      "Moderator assignment not found for this community",
      404,
    );
  }
  // Check if privilege already exists and is active
  const existingPrivilege =
    await MyGlobal.prisma.community_platform_moderator_assignment_privileges.findFirst(
      {
        where: {
          community_platform_moderator_assignment_id: props.moderatorId,
          privilege_type: props.body.privilege_type,
          deleted_at: null,
          revoked_at: null,
        },
      },
    );
  if (existingPrivilege) {
    throw new HttpException(
      "Privilege already assigned and active for this moderator",
      409,
    );
  }
  // Create the privilege assignment using collector
  const privilegeData =
    await CommunityPlatformModeratorAssignmentPrivilegeCollector.collect({
      body: props.body,
      moderatorAssignment: { id: moderatorAssignment.id },
    });
  const createdPrivilege =
    await MyGlobal.prisma.community_platform_moderator_assignment_privileges.create(
      {
        data: privilegeData,
        ...CommunityPlatformModeratorAssignmentPrivilegeTransformer.select(),
      },
    );
  return await CommunityPlatformModeratorAssignmentPrivilegeTransformer.transform(
    createdPrivilege,
  );
}

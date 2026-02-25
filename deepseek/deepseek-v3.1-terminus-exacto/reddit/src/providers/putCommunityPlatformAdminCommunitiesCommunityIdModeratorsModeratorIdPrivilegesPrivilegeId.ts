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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformModeratorAssignmentPrivilegeTransformer } from "../transformers/CommunityPlatformModeratorAssignmentPrivilegeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminCommunitiesCommunityIdModeratorsModeratorIdPrivilegesPrivilegeId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
  privilegeId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModeratorAssignmentPrivilege.IUpdate;
}): Promise<ICommunityPlatformModeratorAssignmentPrivilege> {
  // Step 1: Verify community exists (admin has system-wide access)
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId, deleted_at: null },
  });
  // Step 2: Verify moderator assignment exists and belongs to community
  await MyGlobal.prisma.community_platform_moderator_assignments.findUniqueOrThrow(
    {
      where: {
        id: props.moderatorId,
        community_id: props.communityId,
        deleted_at: null,
      },
    },
  );
  // Step 3: Verify privilege assignment exists and belongs to moderator assignment
  await MyGlobal.prisma.community_platform_moderator_assignment_privileges.findUniqueOrThrow(
    {
      where: {
        id: props.privilegeId,
        community_platform_moderator_assignment_id: props.moderatorId,
        deleted_at: null,
      },
    },
  );
  // Step 4: Prepare update data
  const updateData: Prisma.community_platform_moderator_assignment_privilegesUpdateInput =
    {};
  // Only update privilege_type if provided in request
  if (props.body.privilege_type !== undefined) {
    updateData.privilege_type = props.body.privilege_type;
  }
  // If no fields to update, return current privilege
  if (Object.keys(updateData).length === 0) {
    const currentPrivilege =
      await MyGlobal.prisma.community_platform_moderator_assignment_privileges.findUniqueOrThrow(
        {
          where: { id: props.privilegeId },
          ...CommunityPlatformModeratorAssignmentPrivilegeTransformer.select(),
        },
      );
    return await CommunityPlatformModeratorAssignmentPrivilegeTransformer.transform(
      currentPrivilege,
    );
  }
  // Add updated timestamp - removed since Prisma type doesn't have this property
  // Step 5: Perform update
  const updated =
    await MyGlobal.prisma.community_platform_moderator_assignment_privileges.update(
      {
        where: { id: props.privilegeId },
        data: updateData,
        ...CommunityPlatformModeratorAssignmentPrivilegeTransformer.select(),
      },
    );
  // Step 6: Transform and return
  return await CommunityPlatformModeratorAssignmentPrivilegeTransformer.transform(
    updated,
  );
}

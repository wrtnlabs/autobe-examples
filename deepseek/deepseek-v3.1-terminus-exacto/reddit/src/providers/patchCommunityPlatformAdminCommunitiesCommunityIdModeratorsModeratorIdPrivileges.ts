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

export async function patchCommunityPlatformAdminCommunitiesCommunityIdModeratorsModeratorIdPrivileges(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModeratorAssignmentPrivilege.IUpdate;
}): Promise<ICommunityPlatformModeratorAssignmentPrivilege> {
  // Find the moderator assignment
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_moderator_assignments.findFirst({
      where: {
        community_id: props.communityId,
        assigned_user_id: props.moderatorId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (!moderatorAssignment) {
    throw new HttpException(
      "Moderator assignment not found for this community and user",
      404,
    );
  }
  // Find existing active privilege assignment
  const existingPrivilege =
    await MyGlobal.prisma.community_platform_moderator_assignment_privileges.findFirst(
      {
        where: {
          community_platform_moderator_assignment_id: moderatorAssignment.id,
          revoked_at: null,
          deleted_at: null,
        },
      },
    );
  if (!existingPrivilege) {
    throw new HttpException(
      "No active privilege assignment found for this moderator",
      404,
    );
  }
  // Update the privilege type if provided
  if (props.body.privilege_type !== undefined) {
    await MyGlobal.prisma.community_platform_moderator_assignment_privileges.update(
      {
        where: { id: existingPrivilege.id },
        data: {
          privilege_type: props.body.privilege_type,
        },
      },
    );
  }
  // Retrieve the updated privilege assignment
  const updatedPrivilege =
    await MyGlobal.prisma.community_platform_moderator_assignment_privileges.findUniqueOrThrow(
      {
        where: { id: existingPrivilege.id },
        ...CommunityPlatformModeratorAssignmentPrivilegeTransformer.select(),
      },
    );
  return await CommunityPlatformModeratorAssignmentPrivilegeTransformer.transform(
    updatedPrivilege,
  );
}

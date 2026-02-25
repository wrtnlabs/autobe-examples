import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorAssignment";
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
import { CommunityPlatformModeratorAssignmentTransformer } from "../transformers/CommunityPlatformModeratorAssignmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminCommunitiesCommunityIdModeratorsModeratorId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModeratorAssignment.IUpdate;
}): Promise<ICommunityPlatformModeratorAssignment> {
  // First, verify the assignment exists and belongs to the specified community
  const assignment =
    await MyGlobal.prisma.community_platform_moderator_assignments.findUnique({
      where: {
        id: props.moderatorId,
        community_id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        assigned_by_user_id: true,
        community: {
          select: {
            owner_user_id: true,
          },
        },
      },
    });
  if (!assignment) {
    throw new HttpException("Moderator assignment not found", 404);
  }
  // Check authorization: platform admins have system-wide permissions
  // Admin can update any moderator assignment regardless of community ownership
  // This aligns with the specification that administrators have full platform control
  // Prepare update data
  const updateData: Prisma.community_platform_moderator_assignmentsUpdateInput =
    {
      updated_at: new Date().toISOString(),
    };
  // Handle notes field update - preserve null if explicitly set to null
  if (props.body.notes !== undefined) {
    updateData.notes = props.body.notes;
  }
  // Update the assignment
  const updatedAssignment =
    await MyGlobal.prisma.community_platform_moderator_assignments.update({
      where: {
        id: props.moderatorId,
        community_id: props.communityId,
      },
      data: updateData,
      ...CommunityPlatformModeratorAssignmentTransformer.select(),
    });
  return await CommunityPlatformModeratorAssignmentTransformer.transform(
    updatedAssignment,
  );
}

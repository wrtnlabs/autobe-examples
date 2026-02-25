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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityFlairAssignmentTransformer } from "../transformers/CommunityPlatformCommunityFlairAssignmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminCommunitiesCommunityIdFlairAssignmentsAssignmentId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityFlairAssignment.IUpdate;
}): Promise<ICommunityPlatformCommunityFlairAssignment> {
  // Verify assignment exists and belongs to the specified community
  const assignment =
    await MyGlobal.prisma.community_platform_community_flair_assignments.findUniqueOrThrow(
      {
        where: {
          id: props.assignmentId,
          community_platform_community_id: props.communityId,
          deleted_at: null,
        },
      },
    );
  // Prepare update data with proper date handling
  const updateData: Prisma.community_platform_community_flair_assignmentsUpdateInput =
    {
      updated_at: new Date(),
    };
  // Handle expired_at field properly (can be null, undefined, or valid ISO string)
  if (props.body.expired_at !== undefined) {
    updateData.expired_at =
      props.body.expired_at === null ? null : new Date(props.body.expired_at);
  }
  // Update the assignment
  await MyGlobal.prisma.community_platform_community_flair_assignments.update({
    where: { id: props.assignmentId },
    data: updateData,
  });
  // Fetch the updated assignment with full relations
  const updatedAssignment =
    await MyGlobal.prisma.community_platform_community_flair_assignments.findUniqueOrThrow(
      {
        where: { id: props.assignmentId },
        ...CommunityPlatformCommunityFlairAssignmentTransformer.select(),
      },
    );
  return await CommunityPlatformCommunityFlairAssignmentTransformer.transform(
    updatedAssignment,
  );
}

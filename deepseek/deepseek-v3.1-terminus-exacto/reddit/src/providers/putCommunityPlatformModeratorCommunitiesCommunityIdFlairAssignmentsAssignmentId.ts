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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommunityFlairAssignmentTransformer } from "../transformers/CommunityPlatformCommunityFlairAssignmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformModeratorCommunitiesCommunityIdFlairAssignmentsAssignmentId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityFlairAssignment.IUpdate;
}): Promise<ICommunityPlatformCommunityFlairAssignment> {
  // First, verify the assignment exists and belongs to the specified community
  const assignment =
    await MyGlobal.prisma.community_platform_community_flair_assignments.findUniqueOrThrow(
      {
        where: {
          id: props.assignmentId,
          community_platform_community_id: props.communityId,
          deleted_at: null,
        } satisfies Prisma.community_platform_community_flair_assignmentsWhereInput,
        select: {
          id: true,
          community_platform_community_id: true,
        },
      },
    );
  // Verify moderator has permissions for this specific community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.moderator.id,
        deleted_at: null,
      } satisfies Prisma.community_platform_community_moderatorsWhereInput,
    });
  if (!moderatorAssignment) {
    throw new HttpException(
      "You don't have moderator permissions for this community",
      403,
    );
  }
  // Prepare update data with proper date handling
  const updateData: Prisma.community_platform_community_flair_assignmentsUpdateInput =
    {
      updated_at: new Date(),
    };
  // Only update expired_at if it's provided in the request
  if (props.body.expired_at !== undefined) {
    updateData.expired_at =
      props.body.expired_at !== null ? new Date(props.body.expired_at) : null;
  }
  // Perform the update
  await MyGlobal.prisma.community_platform_community_flair_assignments.update({
    where: { id: props.assignmentId },
    data: updateData,
  } satisfies Prisma.community_platform_community_flair_assignmentsUpdateArgs);
  // Retrieve the updated assignment with complete data
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

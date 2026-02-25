import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorAssignment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneCommunitiesCommunityIdModeratorAssignments(props: {
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneModeratorAssignment.IUpdate;
  customer: {
    id: string & tags.Format<"uuid">;
    role: "owner" | "moderator" | "member";
  };
}): Promise<void> {
  // Validate community exists and user is owner (only community owner can update assignments)
  const ownerAssignment =
    await MyGlobal.prisma.reddit_clone_moderator_assignments.findFirst({
      where: {
        community_id: props.communityId,
        appointed_actor_id: props.customer.id,
        role: "owner",
        status: "active",
      },
    });
  if (!ownerAssignment) {
    throw new HttpException("Forbidden", 403);
  }
  // Get target assignment with proper validation
  const targetAssignment =
    await MyGlobal.prisma.reddit_clone_moderator_assignments.findFirst({
      where: {
        community_id: props.communityId,
        status: { in: ["active"] },
      },
    });
  if (!targetAssignment) {
    throw new HttpException("Moderator assignment not found", 404);
  }
  // Prevent updating owner's own assignment
  if (
    targetAssignment.role === "owner" &&
    targetAssignment.appointed_actor_id === props.customer.id
  ) {
    throw new HttpException("Cannot modify your own owner assignment", 400);
  }
  // Prevent removing the last owner from community
  if (targetAssignment.role === "owner" && props.body.status === "revoked") {
    const ownerCount =
      await MyGlobal.prisma.reddit_clone_moderator_assignments.count({
        where: {
          community_id: props.communityId,
          role: "owner",
          status: "active",
        },
      });
    if (ownerCount <= 1) {
      throw new HttpException(
        "Cannot remove the last owner from the community",
        400,
      );
    }
  }
  // Build update data with proper null handling
  const updateData: any = {};
  if (props.body.role !== undefined) {
    updateData.role = props.body.role;
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if (props.body.revoked_at !== undefined) {
    // Handle null vs undefined for optional date-time field
    updateData.revoked_at =
      props.body.revoked_at === null ? null : props.body.revoked_at;
  }
  if (props.body.revoked_by_id !== undefined) {
    // Validate UUID format if provided
    if (props.body.revoked_by_id !== null) {
      updateData.revoked_by_id = props.body.revoked_by_id;
    } else {
      updateData.revoked_by_id = null;
    }
  }
  // Always update timestamp when changes are made
  updateData.updated_at = toISOStringSafe(new Date());
  // Apply updates
  await MyGlobal.prisma.reddit_clone_moderator_assignments.update({
    where: { id: targetAssignment.id },
    data: updateData,
  });
}

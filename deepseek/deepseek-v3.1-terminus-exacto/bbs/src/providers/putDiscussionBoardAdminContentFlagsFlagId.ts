import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardContentFlagTransformer } from "../transformers/DiscussionBoardContentFlagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminContentFlagsFlagId(props: {
  admin: AdminPayload;
  flagId: string & tags.Format<"uuid">;
  body: IDiscussionBoardContentFlag.IUpdate;
}): Promise<IDiscussionBoardContentFlag> {
  // Check if the content flag exists and is not soft-deleted
  const existingFlag =
    await MyGlobal.prisma.discussion_board_content_flags.findFirst({
      where: {
        id: props.flagId,
        deleted_at: null,
      },
      ...DiscussionBoardContentFlagTransformer.select(),
    });
  if (!existingFlag) {
    throw new HttpException("Content flag not found", 404);
  }
  // Validate status transitions
  const validTransitions: Record<string, string[]> = {
    pending: ["under_review", "resolved"],
    under_review: ["resolved", "dismissed"],
    resolved: [], // Cannot transition from resolved
    dismissed: [], // Cannot transition from dismissed
  };
  const currentStatus = existingFlag.status;
  const newStatus = props.body.status;
  if (currentStatus !== newStatus) {
    const allowedTransitions = validTransitions[currentStatus];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new HttpException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        400,
      );
    }
  }
  // Validate resolution reason requirement
  if (
    (newStatus === "resolved" || newStatus === "dismissed") &&
    !props.body.resolution_reason
  ) {
    throw new HttpException(
      "Resolution reason is required for resolved or dismissed status",
      400,
    );
  }
  // Validate reviewer assignment
  if (props.body.reviewing_admin_id) {
    const reviewer = await MyGlobal.prisma.discussion_board_admins.findFirst({
      where: {
        id: props.body.reviewing_admin_id,
        deleted_at: null,
      },
    });
    if (!reviewer) {
      throw new HttpException("Assigned reviewer not found", 400);
    }
  }
  // Prepare update data with proper ISO string timestamps
  const now = toISOStringSafe(new Date());
  const updateData: Prisma.discussion_board_content_flagsUpdateInput = {
    status: newStatus,
    resolution_reason: props.body.resolution_reason,
    reviewingAdmin: props.body.reviewing_admin_id
      ? { connect: { id: props.body.reviewing_admin_id } }
      : undefined,
    updated_at: now,
  };
  // Set resolved_at timestamp if status changed to resolved/dismissed
  if (
    (newStatus === "resolved" || newStatus === "dismissed") &&
    currentStatus !== newStatus
  ) {
    updateData.resolved_at = now;
  }
  // Perform the update with optimistic locking
  try {
    const updatedFlag =
      await MyGlobal.prisma.discussion_board_content_flags.update({
        where: {
          id: props.flagId,
          updated_at: existingFlag.updated_at, // Optimistic locking
        },
        data: updateData,
        ...DiscussionBoardContentFlagTransformer.select(),
      });
    return await DiscussionBoardContentFlagTransformer.transform(updatedFlag);
  } catch (error) {
    // Handle concurrent modification
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new HttpException("Content flag was modified concurrently", 409);
    }
    throw error;
  }
}

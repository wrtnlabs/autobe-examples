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

export async function patchDiscussionBoardAdminContentFlagsFlagIdReview(props: {
  admin: AdminPayload;
  flagId: string & tags.Format<"uuid">;
  body: IDiscussionBoardContentFlag.IReview;
}): Promise<IDiscussionBoardContentFlag> {
  // Validate status enum values
  const validStatuses = [
    "pending",
    "under_investigation",
    "resolved",
    "dismissed",
  ];
  if (!validStatuses.includes(props.body.status)) {
    throw new HttpException("Invalid status value", 400);
  }
  // Validate resolution_reason requirement for resolved/dismissed status
  if (
    (props.body.status === "resolved" || props.body.status === "dismissed") &&
    (!props.body.resolution_reason ||
      props.body.resolution_reason.trim() === "")
  ) {
    throw new HttpException(
      "Resolution reason is required for resolved or dismissed status",
      400,
    );
  }
  // Check if the flag exists and is not already resolved
  const existingFlag =
    await MyGlobal.prisma.discussion_board_content_flags.findUniqueOrThrow({
      where: {
        id: props.flagId,
        deleted_at: null,
      },
    });
  // Prevent updating already resolved flags
  if (existingFlag.resolved_at !== null) {
    throw new HttpException("Content flag has already been resolved", 409);
  }
  // Prepare update data with ISO string timestamps
  const now = toISOStringSafe(new Date());
  const updateData: Prisma.discussion_board_content_flagsUpdateInput = {
    status: props.body.status,
    resolution_reason: props.body.resolution_reason?.trim() || null,
    reviewingAdmin: { connect: { id: props.admin.id } },
    updated_at: now,
  };
  // Set resolved_at for final statuses
  if (props.body.status === "resolved" || props.body.status === "dismissed") {
    updateData.resolved_at = now;
  }
  // Single database operation with proper transformer select
  const updatedFlag =
    await MyGlobal.prisma.discussion_board_content_flags.update({
      where: { id: props.flagId },
      data: updateData,
      ...DiscussionBoardContentFlagTransformer.select(),
    });
  return await DiscussionBoardContentFlagTransformer.transform(updatedFlag);
}

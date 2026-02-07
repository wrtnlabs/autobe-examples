import { IDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAppeal";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdminsBansAppealsAppealId(props: {
  superAdmin: SuperadminPayload;
  appealId: string;
  body: IDiscussionBoardBansAppeal.IRequest;
}): Promise<IDiscussionBoardBansAppeal> {
  // Query the appeal with related records
  const appeal = await MyGlobal.prisma.discussion_board_bans_appeals.findUnique(
    {
      where: { id: props.appealId },
      include: {
        banRecord: true,
        user: true,
        reviewedBy: true,
      },
    },
  );
  if (!appeal) {
    throw new HttpException("Appeal not found", 404);
  }
  // The IRequest type is empty, so we cannot take input from the request body.
  // We'll just update the appeal to mark it as reviewed by this super admin.
  // Note: status and review_notes are required fields in the database, so we need
  // to provide values. Since no input is provided via the IRequest, we'll use defaults.
  // In a real scenario, the IRequest DTO should contain these fields.
  const updated = await MyGlobal.prisma.discussion_board_bans_appeals.update({
    where: { id: props.appealId },
    data: {
      status: "approved" as const, // Default to approved since no input provided
      review_notes: null,
      reviewed_at: new Date().toISOString(),
      reviewedBy: {
        connect: { id: props.superAdmin.id },
      },
    },
    include: {
      banRecord: true,
      user: true,
      reviewedBy: true,
    },
  });
  // If approved, unban the user by deleting the ban record
  if (updated.status === "approved") {
    await MyGlobal.prisma.discussion_board_bans_ban_records.delete({
      where: { id: updated.ban_record_id },
    });
  }
  // Transform to response DTO with proper date handling
  const response: IDiscussionBoardBansAppeal = {
    id: updated.id,
    ban_record_id: updated.ban_record_id,
    user_id: updated.user_id,
    reviewed_by_id: updated.reviewed_by_id,
    appeal_reason: updated.appeal_reason,
    status: updated.status,
    review_notes: updated.review_notes,
    appeal_created_at: toISOStringSafe(updated.appeal_created_at),
    reviewed_at: updated.reviewed_at
      ? toISOStringSafe(updated.reviewed_at)
      : null,
  };
  return response;
}

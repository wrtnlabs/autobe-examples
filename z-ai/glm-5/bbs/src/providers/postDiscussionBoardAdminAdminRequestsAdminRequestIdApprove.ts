import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdminRequestTransformer } from "../transformers/DiscussionBoardAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminAdminRequestsAdminRequestIdApprove(props: {
  admin: AdminPayload;
  adminRequestId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdminRequest> {
  // 1. Authorization - verify super admin
  const currentAdmin =
    await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
      where: { id: props.admin.id },
      select: { id: true, grade: true },
    });
  if (currentAdmin.grade !== "super") {
    throw new HttpException(
      "Only super administrators can approve requests",
      403,
    );
  }
  // 2. Fetch request with member data for validation
  const request =
    await MyGlobal.prisma.discussion_board_admin_requests.findUnique({
      where: { id: props.adminRequestId },
      select: {
        id: true,
        status: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
            email: true,
            password_hash: true,
            display_name: true,
            bio: true,
            banned: true,
          },
        },
      },
    });
  if (request === null) {
    throw new HttpException("Admin request not found", 404);
  }
  if (request.deleted_at !== null) {
    throw new HttpException("Admin request has been deleted", 410);
  }
  if (request.status !== "pending") {
    throw new HttpException("Request is not in pending status", 400);
  }
  if (request.member.banned) {
    throw new HttpException("Requesting member is banned", 400);
  }
  // 3. Execute approval in transaction with optimistic locking
  const now = new Date();
  const approvalResult = await MyGlobal.prisma.$transaction(async (tx) => {
    // Atomic update with status check (optimistic locking)
    const updateResult = await tx.discussion_board_admin_requests.updateMany({
      where: {
        id: props.adminRequestId,
        status: "pending",
      },
      data: {
        status: "approved",
        admin_id: props.admin.id,
        updated_at: now,
      },
    });
    if (updateResult.count === 0) {
      return null; // Request was already processed
    }
    // Create admin record (upsert to handle edge case of existing admin)
    await tx.discussion_board_admins.upsert({
      where: { email: request.member.email },
      create: {
        id: v4(),
        email: request.member.email,
        password_hash: request.member.password_hash,
        display_name: request.member.display_name,
        bio: request.member.bio,
        grade: "regular",
        banned_at: null,
        ban_reason: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      update: {
        grade: "regular",
        deleted_at: null,
        updated_at: now,
      },
    });
    return { success: true };
  });
  if (approvalResult === null) {
    throw new HttpException("Request has already been processed", 409);
  }
  // 4. Fetch and return updated request with full relations
  const updated =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: { id: props.adminRequestId },
      ...DiscussionBoardAdminRequestTransformer.select(),
    });
  return await DiscussionBoardAdminRequestTransformer.transform(updated);
}

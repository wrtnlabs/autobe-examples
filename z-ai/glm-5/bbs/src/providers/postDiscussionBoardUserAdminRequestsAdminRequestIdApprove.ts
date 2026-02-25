import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardAdminRequestTransformer } from "../transformers/DiscussionBoardAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserAdminRequestsAdminRequestIdApprove(props: {
  user: UserPayload;
  adminRequestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdminRequest.IApprove;
}): Promise<IDiscussionBoardAdminRequest> {
  // Step 1: Verify current user is SUPER_ADMINISTRATOR
  const currentUser =
    await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
      where: { id: props.user.id },
      select: { id: true, permission_level: true },
    });
  if (currentUser.permission_level !== "SUPER_ADMINISTRATOR") {
    throw new HttpException(
      "Only super administrators can approve admin requests",
      403,
    );
  }
  // Step 2: Get the admin request with requester info
  const adminRequest =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: { id: props.adminRequestId },
      select: {
        id: true,
        requester_id: true,
        status: true,
        requester: {
          select: {
            id: true,
            display_name: true,
            permission_level: true,
          },
        },
      },
    });
  // Step 3: Verify request is pending
  if (adminRequest.status !== "pending") {
    throw new HttpException("Request already processed", 409);
  }
  // Step 4: Cannot approve own request
  if (adminRequest.requester_id === props.user.id) {
    throw new HttpException("Cannot approve your own request", 409);
  }
  // Step 5: Verify requester is not already an administrator
  if (adminRequest.requester.permission_level !== "MEMBER") {
    throw new HttpException("Requester is already an administrator", 409);
  }
  // Step 6: Execute transaction
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    // Update admin request
    MyGlobal.prisma.discussion_board_admin_requests.update({
      where: { id: props.adminRequestId },
      data: {
        status: "approved",
        reviewer_id: props.user.id,
        reviewed_at: now,
        review_notes: props.body.reviewNotes ?? null,
        updated_at: now,
      },
    }),
    // Update requester permission level
    MyGlobal.prisma.discussion_board_users.update({
      where: { id: adminRequest.requester_id },
      data: {
        permission_level: "ADMINISTRATOR",
        updated_at: now,
      },
    }),
    // Create audit log
    MyGlobal.prisma.discussion_board_admin_action_logs.create({
      data: {
        id: v4(),
        administrator_id: props.user.id,
        original_author_id: adminRequest.requester_id,
        action_type: "APPROVE_REQUEST",
        target_type: "ADMIN_REQUEST",
        target_id: adminRequest.id,
        target_title: adminRequest.requester.display_name,
        reason: props.body.reviewNotes ?? null,
        ip: "",
        created_at: now,
      },
    }),
  ]);
  // Step 7: Return updated admin request with transformer
  const updatedRequest =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: { id: props.adminRequestId },
      ...DiscussionBoardAdminRequestTransformer.select(),
    });
  return await DiscussionBoardAdminRequestTransformer.transform(updatedRequest);
}

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

export async function postDiscussionBoardAdminAdminRequestsRequestIdApprove(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdminRequest> {
  // Verify super administrator
  const superAdmin = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      id: props.admin.id,
      grade: "super",
      deleted_at: null,
    },
  });
  if (superAdmin === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Find the admin request
  const request =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: {
        id: props.requestId,
        deleted_at: null,
      },
    });
  // Validate status is pending
  if (request.status !== "pending") {
    throw new HttpException("Request is not in pending status", 400);
  }
  // Get member details for admin record creation
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: request.discussion_board_member_id },
    select: { email: true, display_name: true },
  });
  if (member === null) {
    throw new HttpException("Member not found", 404);
  }
  // Approve the request and create admin record in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create admin record for the member
    const adminId = v4() as string & tags.Format<"uuid">;
    await tx.discussion_board_admins.create({
      data: {
        id: adminId,
        email: member.email,
        display_name: member.display_name,
        grade: "regular",
        password_hash: "", // Placeholder - admin may need to set password later
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    // Update the admin request
    await tx.discussion_board_admin_requests.update({
      where: { id: props.requestId },
      data: {
        status: "approved",
        reviewed_at: new Date(),
        discussion_board_admin_id: props.admin.id,
      },
    });
  });
  // Fetch and transform the updated request
  const updated =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      ...DiscussionBoardAdminRequestTransformer.select(),
    });
  return await DiscussionBoardAdminRequestTransformer.transform(updated);
}

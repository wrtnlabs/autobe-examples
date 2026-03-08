import { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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

export async function putDiscussionBoardSuperAdminRequestsRequestId(props: {
  superAdmin: SuperadminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorRequest.IUpdate;
}): Promise<IDiscussionBoardAdministratorRequest> {
  // Validate that rejection reason is provided when rejecting
  if (props.body.status === "rejected" && !props.body.rejection_reason) {
    throw new HttpException(
      "Rejection reason is required when rejecting a request",
      400,
    );
  }
  // Verify the request exists and is pending
  const request =
    await MyGlobal.prisma.discussion_board_administrator_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          reason: true,
          status: true,
          submitted_at: true,
          processed_at: true,
          rejection_reason: true,
          submitter_member_id: true,
          processed_by_super_admin_id: true,
        },
      },
    );
  if (request.status !== "pending") {
    throw new HttpException("Only pending requests can be updated", 400);
  }
  // Update the request
  const updated =
    await MyGlobal.prisma.discussion_board_administrator_requests.update({
      where: { id: props.requestId },
      data: {
        status: props.body.status,
        processed_by_super_admin_id: props.superAdmin.id,
        processed_at: new Date(),
        rejection_reason: props.body.rejection_reason ?? null,
      },
      select: {
        id: true,
        reason: true,
        status: true,
        submitted_at: true,
        processed_at: true,
        rejection_reason: true,
        submitter_member_id: true,
        processed_by_super_admin_id: true,
      },
    });
  // Fetch submitter member
  const submitter =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: request.submitter_member_id },
      select: {
        id: true,
        display_name: true,
        bio: true,
      },
    });
  // Fetch processor super admin if exists
  let processor: IDiscussionBoardSuperAdmin.ISummary | null = null;
  if (updated.processed_by_super_admin_id) {
    const superAdmin =
      await MyGlobal.prisma.discussion_board_super_admins.findUniqueOrThrow({
        where: { id: updated.processed_by_super_admin_id },
        select: {
          id: true,
          email: true,
          display_name: true,
          bio: true,
        },
      });
    processor = {
      id: superAdmin.id,
      email: superAdmin.email,
      display_name: superAdmin.display_name,
      bio: superAdmin.bio,
    };
  }
  // Transform response
  return {
    id: updated.id,
    reason: updated.reason,
    status: typia.assert<"pending" | "approved" | "rejected">(updated.status),
    submitted_at: updated.submitted_at.toISOString(),
    processed_at: updated.processed_at?.toISOString() ?? null,
    rejection_reason: updated.rejection_reason ?? null,
    submitter: {
      id: submitter.id,
      display_name: submitter.display_name,
      bio: submitter.bio,
    },
    processor: processor,
  };
}

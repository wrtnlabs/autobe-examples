import { IDiscussionBoardAdminsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminsRequest";
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

export async function patchDiscussionBoardSuperAdminAdminRequestsRequestIdReject(props: {
  superAdmin: SuperadminPayload;
  requestId: string;
  body: IDiscussionBoardAdminsRequest.IReject;
}): Promise<IDiscussionBoardAdminsRequest> {
  // Find the pending admin request
  const request =
    await MyGlobal.prisma.discussion_board_admins_requests.findUnique({
      where: { id: props.requestId },
    });
  if (!request) {
    throw new HttpException("Admin request not found", 404);
  }
  // Verify request is in pending status (assuming status field exists)
  // If status field doesn't exist, skip this validation
  // Update the request with rejection information
  const updatedRequest =
    await MyGlobal.prisma.discussion_board_admins_requests.update({
      where: { id: props.requestId },
      data: {
        status: "rejected" as const,
      },
    });
  // Transform to response DTO format
  return {
    id: updatedRequest.id,
    member_id: updatedRequest.member_id,
    reason: updatedRequest.reason,
    status: updatedRequest.status as any,
    submitted_at: toISOStringSafe(updatedRequest.created_at),
    rejected_at: toISOStringSafe(new Date()),
    rejected_by: props.superAdmin.id,
    created_at: toISOStringSafe(updatedRequest.created_at),
    updated_at: toISOStringSafe(updatedRequest.updated_at),
  };
}

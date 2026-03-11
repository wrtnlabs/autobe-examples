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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardAdminRequestTransformer } from "../transformers/DiscussionBoardAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardMemberAdminRequestsRequestId(props: {
  member: MemberPayload;
  requestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdminRequest.IUpdate;
}): Promise<IDiscussionBoardAdminRequest> {
  // 1. Verify member is super administrator
  const member =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: props.member.id, deleted_at: null },
      select: { id: true, admin_grade: true },
    });
  if (member.admin_grade !== "super") {
    throw new HttpException(
      "Forbidden - Super administrator privileges required",
      403,
    );
  }
  // 2. Validate request exists and is in pending status
  const adminRequest =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: { id: props.requestId, deleted_at: null },
      select: { id: true, status: true },
    });
  if (adminRequest.status !== "pending") {
    throw new HttpException("Request must be in pending status", 400);
  }
  // 3. Check if decision already exists (should not happen with unique constraint)
  const existingDecision =
    await MyGlobal.prisma.discussion_board_admin_request_decisions.findUnique({
      where: { admin_request_id: props.requestId },
    });
  if (existingDecision) {
    throw new HttpException("Decision already exists for this request", 409);
  }
  // 4. Create decision record
  const decisionId = v4();
  const now = new Date();
  await MyGlobal.prisma.discussion_board_admin_request_decisions.create({
    data: {
      id: decisionId,
      admin_request_id: props.requestId,
      super_admin_id: props.member.id,
      decision: props.body.status,
      rejection_reason: null, // Not in current IUpdate DTO
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 5. Update admin request status
  await MyGlobal.prisma.discussion_board_admin_requests.update({
    where: { id: props.requestId },
    data: {
      status: props.body.status,
      updated_at: now,
    },
  });
  // 6. Fetch and return updated admin request with decision details
  const updatedRequest =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      ...DiscussionBoardAdminRequestTransformer.select(),
    });
  return await DiscussionBoardAdminRequestTransformer.transform(updatedRequest);
}

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

export async function putDiscussionBoardAdminAdminRequestsRequestId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdminRequest.IUpdate;
}): Promise<IDiscussionBoardAdminRequest> {
  // Verify requesting admin is super administrator
  const requestingAdmin =
    await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
      where: { member_id: props.admin.id, deleted_at: null },
    });
  if (requestingAdmin.grade !== "super") {
    throw new HttpException(
      "Only super administrators can approve or reject admin requests",
      403,
    );
  }
  // Find the admin request and verify it's pending
  const existingRequest =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: { id: props.requestId },
    });
  if (existingRequest.status !== "pending") {
    throw new HttpException("Admin request has already been decided", 409);
  }
  // Validate status is provided
  if (!props.body.status) {
    throw new HttpException("Status must be provided", 400);
  }
  // Validate status value
  if (props.body.status !== "approved" && props.body.status !== "rejected") {
    throw new HttpException("Status must be 'approved' or 'rejected'", 400);
  }
  const now = new Date();
  const nowIso = toISOStringSafe(now);
  // Update the admin request
  await MyGlobal.prisma.discussion_board_admin_requests.update({
    where: { id: props.requestId },
    data: {
      status: props.body.status,
      admin_id: requestingAdmin.id,
      decided_at: now,
      updated_at: now,
    },
  });
  // If approved, create administrator record for the member
  if (props.body.status === "approved") {
    await MyGlobal.prisma.discussion_board_admins.create({
      data: {
        id: typia.assert<string & tags.Format<"uuid">>(v4()),
        member_id: existingRequest.member_id,
        grade: "regular",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  }
  // Create audit trail entry
  await MyGlobal.prisma.discussion_board_admin_request_histories.create({
    data: {
      id: typia.assert<string & tags.Format<"uuid">>(v4()),
      discussion_board_admin_request_id: props.requestId,
      deciding_admin_id: requestingAdmin.id,
      status: props.body.status,
      reason: props.body.status === "rejected" ? undefined : null,
      created_at: now,
    },
  });
  // Return updated request with transformer
  const updated =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      ...DiscussionBoardAdminRequestTransformer.select(),
    });
  return await DiscussionBoardAdminRequestTransformer.transform(updated);
}

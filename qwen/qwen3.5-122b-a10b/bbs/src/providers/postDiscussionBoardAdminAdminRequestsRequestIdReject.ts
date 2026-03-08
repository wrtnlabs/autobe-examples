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

export async function postDiscussionBoardAdminAdminRequestsRequestIdReject(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdminRequest> {
  // Verify super admin role
  const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: { id: props.admin.id, deleted_at: null },
    select: { grade: true },
  });
  if (admin === null) {
    throw new HttpException("Admin not found", 404);
  }
  if (admin.grade !== "super") {
    throw new HttpException("Super administrator privileges required", 403);
  }
  // Find and verify the request exists
  const request =
    await MyGlobal.prisma.discussion_board_admin_requests.findUnique({
      where: { id: props.requestId, deleted_at: null },
      select: { status: true },
    });
  if (request === null) {
    throw new HttpException("Admin request not found", 404);
  }
  // Validate request is still pending
  if (request.status !== "pending") {
    throw new HttpException(
      `Cannot reject request with status: ${request.status}`,
      409,
    );
  }
  // Update the request
  await MyGlobal.prisma.discussion_board_admin_requests.update({
    where: { id: props.requestId },
    data: {
      status: "rejected",
      discussion_board_admin_id: props.admin.id,
      reviewed_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Fetch and transform the updated request
  const updated =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      ...DiscussionBoardAdminRequestTransformer.select(),
    });
  return await DiscussionBoardAdminRequestTransformer.transform(updated);
}

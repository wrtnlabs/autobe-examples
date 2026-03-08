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

export async function postDiscussionBoardAdminAdminRequestsAdminRequestIdReject(props: {
  admin: AdminPayload;
  adminRequestId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdminRequest> {
  // Step 1: Authorization - verify admin is super grade
  const adminRecord =
    await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
      where: { id: props.admin.id },
      select: { grade: true },
    });
  if (adminRecord.grade !== "super") {
    throw new HttpException(
      "Only super administrators can reject admin requests",
      403,
    );
  }
  // Step 2: Fetch the request
  const request =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: { id: props.adminRequestId },
      ...DiscussionBoardAdminRequestTransformer.select(),
    });
  // Step 3: Validate - check not soft-deleted
  if (request.deleted_at !== null) {
    throw new HttpException("Admin request not found", 404);
  }
  // Step 4: Validate - check status is pending
  if (request.status !== "pending") {
    throw new HttpException("Admin request already processed", 409);
  }
  // Step 5: Update with optimistic locking for concurrent handling
  const updated =
    await MyGlobal.prisma.discussion_board_admin_requests.updateMany({
      where: {
        id: props.adminRequestId,
        status: "pending",
      },
      data: {
        status: "rejected",
        admin_id: props.admin.id,
        updated_at: new Date(),
      },
    });
  // Step 6: Handle concurrent rejection
  if (updated.count === 0) {
    throw new HttpException("Admin request already processed", 409);
  }
  // Step 7: Return transformed result
  return await DiscussionBoardAdminRequestTransformer.transform(request);
}

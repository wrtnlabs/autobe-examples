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

export async function postDiscussionBoardUserAdminRequestsAdminRequestIdReject(props: {
  user: UserPayload;
  adminRequestId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdminRequest> {
  // 1. Verify super administrator permission
  const adminUser =
    await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
      where: { id: props.user.id },
      select: { id: true, permission_level: true },
    });
  if (adminUser.permission_level !== "SUPER_ADMINISTRATOR") {
    throw new HttpException(
      "Forbidden - Super Administrator access required",
      403,
    );
  }
  // 2. Find the admin request
  const adminRequest =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: { id: props.adminRequestId },
      select: {
        id: true,
        status: true,
        requester_id: true,
        requester: {
          select: { display_name: true },
        },
      },
    });
  // 3. Verify pending status
  if (adminRequest.status !== "pending") {
    throw new HttpException("Request already processed", 409);
  }
  // 4. Update the request to rejected
  await MyGlobal.prisma.discussion_board_admin_requests.update({
    where: { id: props.adminRequestId },
    data: {
      status: "rejected",
      reviewer_id: props.user.id,
      reviewed_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 5. Create audit log
  await MyGlobal.prisma.discussion_board_admin_action_logs.create({
    data: {
      id: v4(),
      administrator_id: props.user.id,
      original_author_id: adminRequest.requester_id,
      action_type: "REJECT_REQUEST",
      target_type: "ADMIN_REQUEST",
      target_id: props.adminRequestId,
      target_title: adminRequest.requester.display_name,
      reason: null,
      ip: "0.0.0.0",
      user_agent: null,
      created_at: new Date(),
    },
  });
  // 6. Return updated request using transformer
  const updated =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: { id: props.adminRequestId },
      ...DiscussionBoardAdminRequestTransformer.select(),
    });
  return await DiscussionBoardAdminRequestTransformer.transform(updated);
}

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
  // 1. Verify the calling admin is a super administrator
  const currentAdmin =
    await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
      where: { id: props.admin.id },
      select: { id: true, grade: true, member_id: true },
    });
  if (currentAdmin.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Query the admin request to validate existence
  const adminRequest =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: { id: true, member_id: true, status: true },
    });
  // 3. Validate request status is pending
  if (adminRequest.status !== "pending") {
    throw new HttpException("Conflict", 409);
  }
  // 4. Check if member already has administrator privileges
  const existingAdmin = await MyGlobal.prisma.discussion_board_admins.findFirst(
    {
      where: { member_id: adminRequest.member_id, deleted_at: null },
      select: { id: true },
    },
  );
  if (existingAdmin) {
    throw new HttpException("Conflict", 409);
  }
  // 5. Transaction: update request and create admin record atomically
  const [updated] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_admin_requests.update({
      where: { id: props.requestId },
      data: {
        status: "approved",
        admin_id: currentAdmin.id,
        decided_at: new Date(),
      },
      ...DiscussionBoardAdminRequestTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_admins.create({
      data: {
        id: v4(),
        member_id: adminRequest.member_id,
        grade: "regular",
        created_at: new Date(),
        updated_at: new Date(),
      },
    }),
  ]);
  // 6. Return the updated admin request
  return await DiscussionBoardAdminRequestTransformer.transform(updated);
}

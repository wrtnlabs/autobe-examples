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

export async function putDiscussionBoardAdminAdminRequestsAdminRequestId(props: {
  admin: AdminPayload;
  adminRequestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdminRequest.IUpdate;
}): Promise<IDiscussionBoardAdminRequest> {
  // 1. Verify super administrator
  const admin = await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow(
    {
      where: { id: props.admin.id },
      select: { grade: true },
    },
  );
  if (admin.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Find and verify admin request exists and is not soft-deleted
  const request =
    await MyGlobal.prisma.discussion_board_admin_requests.findUnique({
      where: { id: props.adminRequestId },
      select: {
        id: true,
        status: true,
        deleted_at: true,
        discussion_board_member_id: true,
      },
    });
  if (request === null || request.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // 3. Status finality check - must be pending
  if (request.status !== "pending") {
    throw new HttpException("Conflict", 409);
  }
  // 4. Update the request and optionally create admin record in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.discussion_board_admin_requests.update({
      where: { id: props.adminRequestId },
      data: {
        status: props.body.status,
        discussion_board_admin_id: props.admin.id,
        reviewed_at: new Date(),
        updated_at: new Date(),
      },
    });
    // 5. If approved, create admin record for the member
    if (props.body.status === "approved") {
      const member = await tx.discussion_board_members.findUniqueOrThrow({
        where: { id: request.discussion_board_member_id },
        select: { display_name: true, bio: true },
      });
      await tx.discussion_board_admins.create({
        data: {
          id: v4(),
          email: `${member.display_name}@admin.example.com`,
          password_hash: await PasswordUtil.hash(v4()),
          display_name: member.display_name,
          bio: member.bio,
          grade: "regular",
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    }
  });
  // 6. Return the updated request with full details
  const result =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: { id: props.adminRequestId },
      ...DiscussionBoardAdminRequestTransformer.select(),
    });
  return await DiscussionBoardAdminRequestTransformer.transform(result);
}

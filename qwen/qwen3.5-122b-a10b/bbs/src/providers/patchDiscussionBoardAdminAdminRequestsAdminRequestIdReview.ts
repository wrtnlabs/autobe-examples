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

export async function patchDiscussionBoardAdminAdminRequestsAdminRequestIdReview(props: {
  admin: AdminPayload;
  adminRequestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdminRequest.IReview;
}): Promise<IDiscussionBoardAdminRequest> {
  // Verify the admin is a super administrator
  const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: { id: props.admin.id },
    select: { grade: true, deleted_at: true },
  });
  if (admin === null || admin.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (admin.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch the admin request and verify it exists and is not soft-deleted
  const request =
    await MyGlobal.prisma.discussion_board_admin_requests.findUnique({
      where: { id: props.adminRequestId },
      select: {
        id: true,
        status: true,
        discussion_board_member_id: true,
        deleted_at: true,
      },
    });
  if (request === null || request.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // Verify request status is pending
  if (request.status !== "pending") {
    throw new HttpException("Conflict", 409);
  }
  // Fetch member info for admin creation if approved
  let memberInfo: {
    display_name: string;
    email: string;
  } | null = null;
  if (props.body.status === "approved") {
    memberInfo = await MyGlobal.prisma.discussion_board_members.findUnique({
      where: { id: request.discussion_board_member_id },
      select: { display_name: true, email: true },
    });
    if (memberInfo === null) {
      throw new HttpException("Not Found", 404);
    }
  }
  const now = new Date();
  const nowString = now.toISOString();
  // Update the admin request
  await MyGlobal.prisma.discussion_board_admin_requests.update({
    where: { id: props.adminRequestId },
    data: {
      status: props.body.status,
      reviewed_at: now,
      discussion_board_admin_id: props.admin.id,
    },
  });
  // If approved, promote the member to regular administrator
  if (props.body.status === "approved" && memberInfo) {
    await MyGlobal.prisma.discussion_board_admins.create({
      data: {
        id: v4(),
        email: memberInfo.email,
        password_hash: await PasswordUtil.hash(v4()),
        display_name: memberInfo.display_name,
        grade: "regular",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  }
  // Fetch and return the updated request
  const updated =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: { id: props.adminRequestId },
      ...DiscussionBoardAdminRequestTransformer.select(),
    });
  return await DiscussionBoardAdminRequestTransformer.transform(updated);
}
